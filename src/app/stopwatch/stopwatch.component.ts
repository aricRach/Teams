import {Component, output} from '@angular/core';

@Component({
  selector: 'app-stopwatch',
  imports: [],
  templateUrl: './stopwatch.component.html',
  standalone: true,
  styleUrl: './stopwatch.component.scss'
})
export class StopwatchComponent {
  time = 0; // Time in milliseconds
  interval: any;
  running = false;

  timeEndEvent = output();


  start(): void {
    if (!this.running) {
      this.running = true;
      this.interval = setInterval(() => {
        this.time += 1000; // Increment time by 10ms
      }, 10);
    }
  }

  pause(): void {
    if (this.running) {
      this.running = false;
      clearInterval(this.interval);
    }
  }

  reset(): void {
    this.pause();
    this.time = 0;
  }

  get formattedTime(): string {
    const seconds = Math.floor(this.time / 1000) % 60;
    const minutes = Math.floor(this.time / 60000);
    return `${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  endGame() {
    this.reset();
    this.timeEndEvent.emit();
  }
}
