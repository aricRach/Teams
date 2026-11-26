import { Component, output, input } from '@angular/core';
import { MatTooltip } from "@angular/material/tooltip";

@Component({
  selector: 'app-stopwatch',
  imports: [MatTooltip],
  templateUrl: './stopwatch.component.html',
  standalone: true,
  styleUrl: './stopwatch.component.scss'
})
export class StopwatchComponent {
  disabled = input(false);
  disabledTooltip = input('');
  private startTime = 0;
  private pausedTime = 0;
  time = 0;
  interval: any;
  running = false;
  // True from the first start until reset/clear, even while paused.
  private hasStarted = false;

  timeEndEvent = output();
  timeStartEvent = output();
  timeStoppedEvent = output();
  timeResetEvent = output();

  start(): void {
    if (!this.running) {
      this.running = true;
      this.hasStarted = true;
      this.startTime = Date.now() - this.pausedTime; // Adjust startTime to include paused time
      this.interval = setInterval(() => this.updateTime(), 1000);
      this.timeStartEvent.emit();
    }
  }

  /** Runs again from the given time without emitting a start, e.g. for a game resumed after a refresh. */
  resumeFrom(elapsedMs: number): void {
    if (this.running) return;
    this.running = true;
    this.hasStarted = true;
    this.time = elapsedMs;
    this.startTime = Date.now() - elapsedMs;
    this.interval = setInterval(() => this.updateTime(), 1000);
  }

  isUnused(): boolean {
    return !this.hasStarted;
  }

  pause(): void {
    if (this.running) {
      this.running = false;
      clearInterval(this.interval);
      this.pausedTime = this.time; // Save elapsed time
      this.timeStoppedEvent.emit();
    }
  }

  reset(): void {
    this.pause();
    this.time = 0;
    this.pausedTime = 0;
    this.hasStarted = false;
    this.timeResetEvent.emit();
  }

  getElapsedMs(): number {
    return this.time;
  }

  clear(): void {
    clearInterval(this.interval);
    this.running = false;
    this.hasStarted = false;
    this.time = 0;
    this.pausedTime = 0;
    this.startTime = 0;
  }

  endGame(): void {
    this.pause();
    this.timeEndEvent.emit();
  }

  // Format time as mm:ss
  get formattedTime(): string {
    const seconds = Math.floor(this.time / 1000) % 60;
    const minutes = Math.floor(this.time / 60000);
    return `${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  // Add leading zero to numbers
  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  // Update time based on real clock
  private updateTime(): void {
    this.time = Date.now() - this.startTime;
  }
}
