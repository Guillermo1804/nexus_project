import { Injectable, signal } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentOverview } from '../academic/academic.models';
import { AcademicService } from '../academic/academic.service';
import { TokenService } from '../auth/token.service';

export type RealtimeStatus = 'closed' | 'connecting' | 'connected' | 'degraded';

export interface AgreementRealtimeEvent {
  schema_version: number;
  event_id: string;
  event_type: 'agreement.created' | 'agreement.status_changed';
  entity: 'agreement';
  entity_id: number;
  student_id: number;
  version: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

export interface RealtimeSnapshot {
  studentId: number;
  overview: StudentOverview;
}

export type RealtimeMetricName = 'connected' | 'reconnected' | 'resynchronized' | 'degraded';

export interface RealtimeMetric {
  name: RealtimeMetricName;
  studentId: number;
  elapsedMs: number;
}

const MAX_RECONNECT_DELAY_MS = 10_000;
const INITIAL_RECONNECT_DELAY_MS = 500;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  readonly status = signal<RealtimeStatus>('closed');
  private readonly eventSubject = new Subject<AgreementRealtimeEvent>();
  private readonly snapshotSubject = new Subject<RealtimeSnapshot>();
  private readonly metricSubject = new Subject<RealtimeMetric>();
  private socket: WebSocket | null = null;
  private studentId: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  private intentionallyClosed = false;
  private hasConnected = false;
  private refreshSubscription: Subscription | null = null;
  private readonly receivedEvents = new Set<string>();
  private readonly latestVersions = new Map<number, string>();

  readonly events$: Observable<AgreementRealtimeEvent> = this.eventSubject.asObservable();
  readonly snapshots$: Observable<RealtimeSnapshot> = this.snapshotSubject.asObservable();
  readonly metrics$: Observable<RealtimeMetric> = this.metricSubject.asObservable();

  constructor(
    private readonly tokens: TokenService,
    private readonly academic: AcademicService,
  ) {}

  connect(studentId: number): void {
    if (!environment.realtimeEnabled) {
      this.studentId = studentId;
      this.status.set('closed');
      return;
    }
    if (this.studentId === studentId && this.socket) return;

    this.disconnect();
    this.studentId = studentId;
    this.intentionallyClosed = false;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this.hasConnected = false;
    this.open();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearReconnectTimer();
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = null;
    this.socket?.close(1000, 'client disconnect');
    this.socket = null;
    this.studentId = null;
    this.status.set('closed');
    this.receivedEvents.clear();
    this.latestVersions.clear();
  }

  retry(): void {
    if (this.studentId === null) return;
    this.intentionallyClosed = false;
    this.clearReconnectTimer();
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this.open();
  }

  private open(): void {
    const studentId = this.studentId;
    const access = this.tokens.access();
    if (studentId === null || !access || typeof WebSocket === 'undefined') {
      this.status.set('degraded');
      if (studentId !== null) this.emitMetric('degraded', studentId, 0);
      return;
    }

    this.status.set('connecting');
    const startedAt = performance.now();
    const metricName = this.hasConnected ? 'reconnected' : 'connected';
    const socket = new WebSocket(
      `${environment.webSocketUrl}/ws/students/${studentId}/`,
      ['nexus.jwt', access],
    );
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      this.status.set('connected');
      this.hasConnected = true;
      this.emitMetric(metricName, studentId, performance.now() - startedAt);
      this.synchronize(studentId);
    };
    socket.onmessage = message => this.handleMessage(message.data, studentId);
    socket.onerror = () => {
      this.status.set('degraded');
      this.emitMetric('degraded', studentId, performance.now() - startedAt);
    };
    socket.onclose = close => this.handleClose(close.code, studentId);
  }

  private handleClose(code: number, studentId: number): void {
    if (this.studentId !== studentId || this.intentionallyClosed) return;
    this.socket = null;
    this.status.set('degraded');
    if (code === 4401) {
      this.refreshSubscription?.unsubscribe();
      this.refreshSubscription = this.tokens.refreshAccessToken().subscribe({
        next: () => this.scheduleReconnect(studentId),
        error: () => this.status.set('closed'),
      });
      return;
    }
    this.scheduleReconnect(studentId);
  }

  private scheduleReconnect(studentId: number): void {
    if (this.studentId !== studentId || this.intentionallyClosed || this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private synchronize(studentId: number): void {
    const startedAt = performance.now();
    this.academic.getStudentOverview(studentId).subscribe({
      next: overview => {
        this.snapshotSubject.next({ studentId, overview });
        this.emitMetric('resynchronized', studentId, performance.now() - startedAt);
      },
      error: () => {
        this.status.set('degraded');
        this.emitMetric('degraded', studentId, 0);
      },
    });
  }

  private emitMetric(name: RealtimeMetricName, studentId: number, elapsedMs: number): void {
    this.metricSubject.next({
      name,
      studentId,
      elapsedMs: Math.round(elapsedMs),
    });
  }

  private handleMessage(raw: unknown, studentId: number): void {
    let message: unknown;
    try {
      message = JSON.parse(String(raw));
    } catch {
      this.synchronize(studentId);
      return;
    }

    if (this.isAgreementEvent(message)) {
      if (message.student_id !== studentId || this.receivedEvents.has(message.event_id)) return;
      const latestVersion = this.latestVersions.get(message.entity_id);
      if (latestVersion && message.version <= latestVersion) return;
      this.receivedEvents.add(message.event_id);
      this.latestVersions.set(message.entity_id, message.version);
      this.eventSubject.next(message);
      return;
    }

    if (typeof message === 'object' && message !== null && 'type' in message && message.type === 'connection.ready') return;
    this.synchronize(studentId);
  }

  private isAgreementEvent(value: unknown): value is AgreementRealtimeEvent {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<AgreementRealtimeEvent>;
    return event.schema_version === 1
      && typeof event.event_id === 'string'
      && (event.event_type === 'agreement.created' || event.event_type === 'agreement.status_changed')
      && event.entity === 'agreement'
      && typeof event.entity_id === 'number'
      && typeof event.student_id === 'number'
      && typeof event.version === 'string'
      && typeof event.occurred_at === 'string'
      && typeof event.payload === 'object'
      && event.payload !== null;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
