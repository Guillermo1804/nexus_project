import { of } from 'rxjs';
import { AcademicService } from '../academic/academic.service';
import { TokenService } from '../auth/token.service';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let socket: FakeWebSocket;
  let webSocketSpy: jasmine.Spy;
  const overview = { student: 7 } as never;
  const tokens = { access: () => 'access-token', refreshAccessToken: () => of({ access: 'new-token' }) } as unknown as TokenService;
  const academic = {
    getStudentOverview: jasmine.createSpy().and.returnValue(of(overview)),
  } as unknown as AcademicService;

  beforeEach(() => {
    socket = new FakeWebSocket();
    webSocketSpy = spyOn(window, 'WebSocket').and.returnValue(socket as unknown as WebSocket);
    service = new RealtimeService(tokens, academic);
  });

  afterEach(() => service.disconnect());

  it('connects with the JWT subprotocol and synchronizes on open', () => {
    service.connect(7);
    socket.open();

    expect(webSocketSpy.calls.mostRecent().args[1]).toEqual(['nexus.jwt', 'access-token']);
    expect(service.status()).toBe('connected');
    expect(academic.getStudentOverview).toHaveBeenCalledWith(7);
  });

  it('emits valid events once and ignores older or duplicate versions', () => {
    const events: unknown[] = [];
    service.events$.subscribe(event => events.push(event));
    service.connect(7);
    socket.open();

    const event = {
      schema_version: 1,
      event_id: 'event-1',
      event_type: 'agreement.created',
      entity: 'agreement',
      entity_id: 3,
      student_id: 7,
      version: '2026-11-06T13:00:00.000Z',
      occurred_at: '2026-11-06T13:00:00.000Z',
      payload: { id: 3 },
    };
    socket.message(event);
    socket.message(event);
    socket.message({ ...event, event_id: 'event-old', version: '2026-11-05T13:00:00.000Z' });

    expect(events).toEqual([event]);
  });

  it('marks the connection degraded and retries after an unexpected close', () => {
    jasmine.clock().install();
    try {
      service.connect(7);
      socket.close(1006);

      expect(service.status()).toBe('degraded');
      jasmine.clock().tick(500);
      expect(window.WebSocket).toHaveBeenCalledTimes(2);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('refreshes the access token after an authentication close', () => {
    service.connect(7);
    socket.close(4401);

    expect(tokens.refreshAccessToken).toHaveBeenCalled();
  });

  it('does not retry after an intentional disconnect', () => {
    jasmine.clock().install();
    try {
      service.connect(7);
      service.disconnect();
      jasmine.clock().tick(1000);
      expect(window.WebSocket).toHaveBeenCalledTimes(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

class FakeWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((message: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor() {}

  open(): void { this.onopen?.(); }
  message(data: unknown): void { this.onmessage?.({ data } as MessageEvent); }
  close(code = 1000): void { this.onclose?.({ code } as CloseEvent); }
}
