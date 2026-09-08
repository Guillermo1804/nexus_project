import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
<<<<<<< HEAD
import { provideRouter } from '@angular/router';

=======
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
>>>>>>> 5500b6479b20ea3dd7350205b1f3603b392e4fa2
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

<<<<<<< HEAD
  it('should render the application shell', () => {
=======
  it('should render the router outlet', () => {
>>>>>>> 5500b6479b20ea3dd7350205b1f3603b392e4fa2
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
