import { Component, signal, computed, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../../core/services/ai';
import { Tasks } from '../../../core/services/tasks';
import { ParsedTask } from '../../../core/models';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ParsedTask[];
  actionType?: string;
}

@Component({
  selector: 'app-ai-chat',
  imports: [FormsModule],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css'
})
export class AIChat implements AfterViewInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private aiService = inject(AiService);
  private tasksService = inject(Tasks);

  messages = signal<DisplayMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Lufy, your task assistant. Tell me what you need to do, like 'buy milk, call mom tomorrow, fix bike'.",
      timestamp: new Date()
    }
  ]);

  inputMessage = signal('');
  isTyping = signal(false);
  pendingActions = signal<ParsedTask[]>([]);
  pendingActionType = signal<string | null>(null);
  isExecuting = signal(false);

  hasMessages = computed(() => this.messages().length > 0);
  hasPendingActions = computed(() => this.pendingActions().length > 0);

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  async sendMessage(): Promise<void> {
    const content = this.inputMessage().trim();
    if (!content || this.isTyping() || this.isExecuting()) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    this.inputMessage.set('');
    this.scrollToBottom();

    this.isTyping.set(true);
    this.scrollToBottom();

    try {
      const response = await this.aiService.sendMessage(content);

      const aiMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        actions: response.actions,
        actionType: response.action_type
      };

      this.messages.update(msgs => [...msgs, aiMessage]);

      if (response.actions && response.actions.length > 0 && response.action_type) {
        this.pendingActions.set(response.actions);
        this.pendingActionType.set(response.action_type);
      }

    } catch {
      const errorMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      this.messages.update(msgs => [...msgs, errorMessage]);
    } finally {
      this.isTyping.set(false);
      this.scrollToBottom();
    }
  }

  async executeActions(): Promise<void> {
    const actions = this.pendingActions();
    const actionType = this.pendingActionType();

    if (!actions.length || !actionType) return;

    this.isExecuting.set(true);

    try {
      const response = await this.aiService.executeActions(actions, actionType);

      const resultMessage: DisplayMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };
      this.messages.update(msgs => [...msgs, resultMessage]);

      if (response.success) {
        this.pendingActions.set([]);
        this.pendingActionType.set(null);
        this.tasksService.loadCounts();
      } else if (response.created_ids && response.created_ids.length > 0) {
        const createdCount = response.created_ids.length;
        const remainingActions = actions.slice(createdCount);
        this.pendingActions.set(remainingActions);
        this.tasksService.loadCounts();
      }

    } catch {
      const errorMessage: DisplayMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Failed to create tasks. Please try again.",
        timestamp: new Date()
      };
      this.messages.update(msgs => [...msgs, errorMessage]);
    } finally {
      this.isExecuting.set(false);
      this.scrollToBottom();
    }
  }

  cancelActions(): void {
    this.pendingActions.set([]);
    this.pendingActionType.set(null);

    const cancelMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "No problem! Let me know if you'd like to try again.",
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, cancelMessage]);
    this.scrollToBottom();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  formatDueDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
