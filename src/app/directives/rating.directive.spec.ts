import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RatingDirective } from './rating.directive';

@Component({
  imports: [RatingDirective],
  template: `<span appRating>Dan</span>`,
})
class HostComponent {}

describe('RatingDirective', () => {
  it('should create an instance', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const directive = fixture.debugElement.query(By.directive(RatingDirective)).injector.get(RatingDirective);
    expect(directive).toBeTruthy();
  });
});
