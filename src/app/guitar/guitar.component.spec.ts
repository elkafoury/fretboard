import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuitarComponent } from './guitar.component';

describe('GuitarComponent', () => {
  let component: GuitarComponent;
  let fixture: ComponentFixture<GuitarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuitarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuitarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
