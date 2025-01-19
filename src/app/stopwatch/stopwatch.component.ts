import {Component, output} from '@angular/core';

@Component({
  selector: 'app-stopwatch',
  imports: [],
  templateUrl: './stopwatch.component.html',
  standalone: true,
  styleUrl: './stopwatch.component.scss'
})
export class StopwatchComponent {

  private startTime = 0;
  private pausedTime = 0;
  time = 0;
  interval: any;
  running = false;

  timeEndEvent = output();

  start(): void {
    if (!this.running) {
      this.running = true;
      this.startTime = Date.now() - this.pausedTime; // Adjust startTime to include paused time
      this.interval = setInterval(() => this.updateTime(), 1000);
    }
  }

  pause(): void {
    if (this.running) {
      this.running = false;
      clearInterval(this.interval);
      this.pausedTime = this.time; // Save elapsed time
    }
  }

  reset(): void {
    this.pause();
    this.time = 0;
    this.pausedTime = 0;
  }

  endGame(): void {
    this.reset();
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
