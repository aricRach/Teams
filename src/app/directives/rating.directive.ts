import {AfterViewInit, Directive, ElementRef, input, OnChanges, Renderer2, SimpleChanges} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appRating]'
})
export class RatingDirective implements AfterViewInit, OnChanges {

  shouldHide = input();

  private originalContent: string = ''; // Store the original text content
  private ratingContent: string | null = null; // Store the matched rating part

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    this.extractRating();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['shouldHide']) {
      this.toggleRating();
    }
  }

  private extractRating(): void {
    const element = this.el.nativeElement;
    this.originalContent = element.textContent || '';

    // Match the `- rating(number)` pattern
    const ratingPattern = /rating\(\d+(\.\d+)?\)/;
    const match = this.originalContent.match(ratingPattern);

    if (match) {
      this.ratingContent = match[0]; // The matched rating part
      const nonRatingContent = this.originalContent.replace(ratingPattern, '').trim(); // Remaining content

      // Update the element text to keep the non-rating content
      this.renderer.setProperty(element, 'textContent', nonRatingContent);

      if (!this.shouldHide() && this.ratingContent) {
        // Add the rating back if not hidden
        const updatedContent = `${nonRatingContent} ${this.ratingContent}`;
        this.renderer.setProperty(element, 'textContent', updatedContent);
      }
    } else {
      console.error('No match found for the rating pattern.');
    }
  }

  private toggleRating(): void {
    const element = this.el.nativeElement;
    const nonRatingContent = this.originalContent.replace(this.ratingContent || '', '').trim();

    if (this.shouldHide()) {
      // Hide the rating by only keeping non-rating content
      this.renderer.setProperty(element, 'textContent', nonRatingContent);
    } else if (this.ratingContent) {
      // Show the rating by appending it back
      const updatedContent = `${nonRatingContent} ${this.ratingContent}`;
      this.renderer.setProperty(element, 'textContent', updatedContent);
    }
  }
}
