import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuitarProComponent } from './guitar-pro.component';

describe('GuitarProComponent', () => {
  let component: GuitarProComponent;
  let fixture: ComponentFixture<GuitarProComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuitarProComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuitarProComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
