import { Component, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chat',
  imports: [FormsModule],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css'
})
export class AIChat implements AfterViewInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  messages = signal<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you plan goals, break down tasks, and stay organized. What would you like to work on?",
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      role: 'user',
      content: 'I want to learn German in 6 months',
      timestamp: new Date(Date.now() - 240000)
    },
    {
      id: '3',
      role: 'assistant',
      content: "Great choice! Learning German in 6 months is achievable. Let me help you create a structured plan.\n\nA few questions first:\n\n1. What's your current level? (Complete beginner, some basics, intermediate)\n2. How much time can you dedicate daily?\n3. What's your main goal? (Travel, work, certification)",
      timestamp: new Date(Date.now() - 180000)
    },
    {
      id: '4',
      role: 'user',
      content: "I'm a complete beginner. I can do about 30 minutes per day. I want to be able to have basic conversations when I travel to Germany.",
      timestamp: new Date(Date.now() - 120000)
    },
    {
      id: '5',
      role: 'assistant',
      content: "Perfect! With 30 minutes daily, you can reach A2/B1 level in 6 months - enough for basic travel conversations.\n\nHere's my suggested plan:\n\n**Goal: Learn German for Travel**\n\nWeeks 1-4: Foundations\n• Alphabet & pronunciation\n• Numbers, greetings, introductions\n• Basic phrases (please, thank you, excuse me)\n\nWeeks 5-12: Core Grammar\n• Articles (der, die, das)\n• Present tense verbs\n• Common vocabulary (500 words)\n\nWeeks 13-20: Practical Skills\n• Ordering food, asking directions\n• Hotel & transportation phrases\n• Past tense basics\n\nWeeks 21-24: Conversation Practice\n• Speaking exercises\n• Listening comprehension\n• Travel scenario practice\n\nWant me to create this as a goal with weekly tasks?",
      timestamp: new Date(Date.now() - 60000)
    }
  ]);

  inputMessage = signal('');
  isTyping = signal(false);

  hasMessages = computed(() => this.messages().length > 0);

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  sendMessage(): void {
    const content = this.inputMessage().trim();
    if (!content || this.isTyping()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    this.inputMessage.set('');
    this.scrollToBottom();

    // Simulate AI typing
    this.isTyping.set(true);
    this.scrollToBottom();

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I understand! Let me work on that for you. (This is a demo response - AI integration coming soon)",
        timestamp: new Date()
      };
      this.messages.update(msgs => [...msgs, aiMessage]);
      this.isTyping.set(false);
      this.scrollToBottom();
    }, 1500);
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
}
