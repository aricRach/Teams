import {Component, input, output} from '@angular/core';

let nextDateFilterId = 0;

@Component({
  selector: 'app-date-filter',
  templateUrl: './date-filter.component.html',
  styleUrl: './date-filter.component.scss',
})
export class DateFilterComponent {
  readonly label = input('Select Date:');
  readonly dates = input.required<string[]>();
  readonly selectedDate = input.required<string>();
  readonly dateSelected = output<string>();

  protected readonly selectId = `date-filter-${nextDateFilterId++}`;

  protected onSelectionChange(event: Event): void {
    this.dateSelected.emit((event.target as HTMLSelectElement).value);
  }
}
