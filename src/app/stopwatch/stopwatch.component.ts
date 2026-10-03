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

  timeEndEvent = output();
  timeStartEvent = output();
  timeStoppedEvent = output();
  timeResetEvent = output();

  start(): void {
    if (!this.running) {
      this.running = true;
      this.startTime = Date.now() - this.pausedTime; // Adjust startTime to include paused time
      this.interval = setInterval(() => this.updateTime(), 1000);
      this.timeStartEvent.emit();
    }
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
    this.timeResetEvent.emit();
  }

  /** Elapsed time in ms (matches displayed timer when running or paused). */
  getElapsedMs(): number {
    return this.time;
  }

  /** Zero the timer without emitting any event (used after a league game ends). */
  clear(): void {
    clearInterval(this.interval);
    this.running = false;
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
