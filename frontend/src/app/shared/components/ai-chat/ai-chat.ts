import { Component, signal, computed, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiService, DisplayMessage } from '../../../core/services/ai';
import { Tasks } from '../../../core/services/tasks';
import { Goals } from '../../../core/services/goals';
import { UserService } from '../../../core/services/user';
import { ParsedTask, SubtaskActions, GoalPlan, GOAL_COLORS, GoalColor } from '../../../core/models';

@Component({
  selector: 'app-ai-chat',
  imports: [FormsModule],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css'
})
export class AIChat implements AfterViewInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  private aiService = inject(AiService);
  private tasksService = inject(Tasks);
  private goalsService = inject(Goals);
  private userService = inject(UserService);

  userPicture = computed(() => this.userService.user()?.picture || null);
  userInitials = computed(() => this.userService.getInitials());
  messages = computed(() => this.aiService.messages());

  inputMessage = signal('');

  constructor() {
    this.aiService.loadHistory().then(() => {
      this.scrollToBottom();
    });
  }
  isTyping = signal(false);
  pendingActions = signal<ParsedTask[] | SubtaskActions | GoalPlan | null>(null);
  pendingActionType = signal<string | null>(null);
  isExecuting = signal(false);

  hasMessages = computed(() => this.messages().length > 0);
  hasPendingActions = computed(() => {
    const actions = this.pendingActions();
    if (!actions) return false;
    if (Array.isArray(actions)) return actions.length > 0;
    if ('goal_title' in actions) return !!actions.tasks?.length;
    return !!actions.subtasks?.length;
  });
  isSubtaskAction = computed(() => this.pendingActionType() === 'create_subtasks');
  isPlanAction = computed(() => this.pendingActionType() === 'create_goal_plan');
  pendingTasks = computed(() => {
    const actions = this.pendingActions();
    return Array.isArray(actions) ? actions : [];
  });
  pendingSubtasks = computed(() => {
    const actions = this.pendingActions();
    if (!actions || Array.isArray(actions) || 'goal_title' in actions) return null;
    return actions as SubtaskActions;
  });
  pendingPlan = computed(() => {
    const actions = this.pendingActions();
    if (!actions || Array.isArray(actions) || !('goal_title' in actions)) return null;
    return actions as GoalPlan;
  });

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

    this.aiService.addMessage(userMessage);
    this.inputMessage.set('');
    this.scrollToBottom();

    this.isTyping.set(true);
    this.scrollToBottom();

    try {
      const response = await this.aiService.sendMessage(content);
      this.isTyping.set(false);

      const messageId = (Date.now() + 1).toString();
      const aiMessage: DisplayMessage = {
        id: messageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        actions: response.actions,
        actionType: response.action_type
      };

      this.aiService.addMessage(aiMessage);
      await this.typewriterEffect(messageId, response.message);

      if (response.actions && response.action_type) {
        let hasActions = false;
        if (Array.isArray(response.actions)) {
          hasActions = response.actions.length > 0;
        } else if ('goal_title' in response.actions) {
          hasActions = !!response.actions.tasks?.length;
        } else {
          hasActions = !!response.actions.subtasks?.length;
        }

        if (hasActions) {
          this.pendingActions.set(response.actions);
          this.pendingActionType.set(response.action_type);
          this.scrollToBottom();
        }
      }

    } catch {
      this.isTyping.set(false);
      const errorMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      this.aiService.addMessage(errorMessage);
      this.scrollToBottom();
    }
  }

  async executeActions(): Promise<void> {
    const actions = this.pendingActions();
    const actionType = this.pendingActionType();

    if (!actions || !actionType) {
      return;
    }

    this.isExecuting.set(true);

    try {
      const response = await this.aiService.executeActions(actions, actionType);

      const resultMessage: DisplayMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };
      this.aiService.addMessage(resultMessage);

      if (response.success) {
        this.pendingActions.set(null);
        this.pendingActionType.set(null);
        this.tasksService.reloadCurrentView();
        this.goalsService.loadGoals();
      } else if (response.created_ids && response.created_ids.length > 0) {
        if (Array.isArray(actions)) {
          const createdCount = response.created_ids.length;
          const remainingActions = actions.slice(createdCount);
          this.pendingActions.set(remainingActions.length > 0 ? remainingActions : null);
        } else {
          this.pendingActions.set(null);
        }
        this.pendingActionType.set(null);
        this.tasksService.reloadCurrentView();
        this.goalsService.loadGoals();
      }

    } catch (err) {
      let errorContent = "Failed to create tasks. Please try again.";
      if (actionType === 'create_subtasks') {
        errorContent = "Failed to create subtasks. Please try again.";
      } else if (actionType === 'create_goal_plan') {
        errorContent = "Failed to create the plan. Please try again.";
      }
      const errorMessage: DisplayMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      this.aiService.addMessage(errorMessage);
    } finally {
      this.isExecuting.set(false);
      this.scrollToBottom();
    }
  }

  cancelActions(): void {
    this.pendingActions.set(null);
    this.pendingActionType.set(null);

    const cancelMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "No problem! Let me know if you'd like to try again.",
      timestamp: new Date()
    };
    this.aiService.addMessage(cancelMessage);
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

  getGoalColorHex(colorName: string | undefined): string {
    if (!colorName) return GOAL_COLORS.blue;
    const key = colorName.toLowerCase() as GoalColor;
    return GOAL_COLORS[key] || GOAL_COLORS.blue;
  }

  resizeTextarea(): void {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 72;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  }

  parseMessageContent(content: string): string {
    if (!content) return '';
    // Basic sanitization (replace < and > to prevent XSS if we were using a real parser, but here we trust backend mostly or just do simple replacements)
    // Note: Angular [innerHTML] has some built-in sanitization, but let's be careful.
    // For this simple case, we just replace bold syntax.
    
    // 1. Replace newlines with <br>
    let formatted = content.replace(/\n/g, '<br>');
    
    // 2. Replace **text** with <b>text</b>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    return formatted;
  }

  private async typewriterEffect(messageId: string, fullText: string): Promise<void> {
    const chunkSize = 3;
    const delay = 15;

    for (let i = 0; i <= fullText.length; i += chunkSize) {
      const partialText = fullText.slice(0, i);
      this.aiService.updateMessage(messageId, { content: partialText });
      this.scrollToBottom();
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.aiService.updateMessage(messageId, { content: fullText });
  }
}
