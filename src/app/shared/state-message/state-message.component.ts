import {Component, computed, input, output} from '@angular/core';

export type StateMessageKind = 'empty' | 'error';

const ERROR_DEFAULTS = {
  heading: "Couldn't load data",
  detail: 'Check your connection, then try again.',
  actionLabel: 'Try again',
};

@Component({
  selector: 'app-state-message',
  templateUrl: './state-message.component.html',
  styleUrl: './state-message.component.scss',
  host: {
    '[class]': 'kindClass()',
    '[attr.role]': 'role()',
  },
})
export class StateMessageComponent {
  readonly kind = input.required<StateMessageKind>();
  readonly heading = input<string>();
  readonly detail = input<string>();
  readonly actionLabel = input<string>();
  readonly actionClicked = output<void>();

  private readonly isError = computed(() => this.kind() === 'error');

  protected readonly kindClass = computed(() => `state-message--${this.kind()}`);
  protected readonly role = computed(() => this.isError() ? 'alert' : 'status');

  protected readonly resolvedHeading = computed(() =>
    this.heading() ?? (this.isError() ? ERROR_DEFAULTS.heading : ''));
  protected readonly resolvedDetail = computed(() =>
    this.detail() ?? (this.isError() ? ERROR_DEFAULTS.detail : undefined));
  protected readonly resolvedActionLabel = computed(() =>
    this.actionLabel() ?? (this.isError() ? ERROR_DEFAULTS.actionLabel : undefined));
}
