import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatPendingComponent } from './chat-pending.component';

describe('ChatPendingComponent', () => {
  let component: ChatPendingComponent;
  let fixture: ComponentFixture<ChatPendingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChatPendingComponent]
    });
    fixture = TestBed.createComponent(ChatPendingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
