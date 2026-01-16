import {
  Component,
  signal,
  computed,
  output,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';

const ONBOARDING_COMPLETE_KEY = 'helpme_onboarding_complete';

interface TypewriterConfig {
  text: string;
  speed: number;
}

@Component({
  selector: 'app-onboarding-modal',
  standalone: true,
  templateUrl: './onboarding-modal.html',
  styleUrl: './onboarding-modal.css'
})
export class OnboardingModal implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('modalCard') modalCard!: ElementRef;

  completed = output<void>();

  currentSlide = signal(0);
  totalSlides = 3;
  isAnimating = signal(false);
  slideDirection = signal<'next' | 'prev'>('next');
  isVisible = signal(false);

  // Slide 2 animations
  typingText = signal('');
  showTaskCards = signal(false);
  taskCardsVisible = signal<number[]>([]);

  // Slide 3 animations
  showUserBubble = signal(false);
  showLufyBubble = signal(false);
  showPlanCard = signal(false);
  planItemsVisible = signal<number[]>([]);

  private typingInterval: ReturnType<typeof setInterval> | null = null;
  private animationTimeouts: ReturnType<typeof setTimeout>[] = [];

  // Computed
  isFirstSlide = computed(() => this.currentSlide() === 0);
  isLastSlide = computed(() => this.currentSlide() === this.totalSlides - 1);

  // Demo data
  readonly demoTasks = [
    { title: 'Buy milk', time: 'Today' },
    { title: 'Call mom', time: 'Tomorrow' },
    { title: 'Finish report', time: 'Fri, Jan 17' }
  ];

  readonly demoPlanItems = [
    'Week 1-2: Learn Hiragana basics',
    'Week 3-4: Master Katakana',
    'Week 5-6: Basic phrases & greetings'
  ];

  readonly fullTypingText = 'Buy milk, call mom tomorrow, finish report by Friday';

  ngOnInit() {
    // Trigger entrance animation
    setTimeout(() => {
      this.isVisible.set(true);
    }, 50);
  }

  ngAfterViewInit() {
    // Start slide 1 animations after modal is visible
    setTimeout(() => {
      this.startSlideAnimations(0);
    }, 600);
  }

  ngOnDestroy() {
    this.clearAllAnimations();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.skip();
    } else if (event.key === 'ArrowRight' && !this.isLastSlide()) {
      this.nextSlide();
    } else if (event.key === 'ArrowLeft' && !this.isFirstSlide()) {
      this.prevSlide();
    }
  }

  nextSlide() {
    if (this.isAnimating() || this.isLastSlide()) return;

    this.isAnimating.set(true);
    this.slideDirection.set('next');
    this.clearSlideAnimations();

    const nextIndex = this.currentSlide() + 1;

    // Wait for exit animation
    this.addTimeout(() => {
      this.currentSlide.set(nextIndex);

      // Wait for enter animation then start slide-specific animations
      this.addTimeout(() => {
        this.isAnimating.set(false);
        this.startSlideAnimations(nextIndex);
      }, 400);
    }, 50);
  }

  prevSlide() {
    if (this.isAnimating() || this.isFirstSlide()) return;

    this.isAnimating.set(true);
    this.slideDirection.set('prev');
    this.clearSlideAnimations();

    const prevIndex = this.currentSlide() - 1;

    this.addTimeout(() => {
      this.currentSlide.set(prevIndex);

      this.addTimeout(() => {
        this.isAnimating.set(false);
        this.startSlideAnimations(prevIndex);
      }, 400);
    }, 50);
  }

  goToSlide(index: number) {
    if (this.isAnimating() || index === this.currentSlide()) return;

    this.isAnimating.set(true);
    this.slideDirection.set(index > this.currentSlide() ? 'next' : 'prev');
    this.clearSlideAnimations();

    this.addTimeout(() => {
      this.currentSlide.set(index);

      this.addTimeout(() => {
        this.isAnimating.set(false);
        this.startSlideAnimations(index);
      }, 400);
    }, 50);
  }

  skip() {
    this.completeOnboarding();
  }

  getStarted() {
    this.completeOnboarding();
  }

  private completeOnboarding() {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    this.isVisible.set(false);

    // Wait for exit animation
    this.addTimeout(() => {
      this.completed.emit();
    }, 400);
  }

  private startSlideAnimations(slideIndex: number) {
    switch (slideIndex) {
      case 0:
        // Slide 1: Lufy animations handled by CSS
        break;

      case 1:
        // Slide 2: Typing effect + task cards
        this.startTypingAnimation();
        break;

      case 2:
        // Slide 3: Chat bubbles + plan cascade
        this.startPlanAnimation();
        break;
    }
  }

  private startTypingAnimation() {
    this.typingText.set('');
    this.showTaskCards.set(false);
    this.taskCardsVisible.set([]);

    const text = this.fullTypingText;
    let index = 0;

    this.typingInterval = setInterval(() => {
      if (index <= text.length) {
        this.typingText.set(text.substring(0, index));
        index++;
      } else {
        if (this.typingInterval) {
          clearInterval(this.typingInterval);
          this.typingInterval = null;
        }

        // Show sparkle and then task cards
        this.addTimeout(() => {
          this.showTaskCards.set(true);

          // Cascade task cards
          this.demoTasks.forEach((_, i) => {
            this.addTimeout(() => {
              this.taskCardsVisible.update(arr => [...arr, i]);
            }, i * 150);
          });
        }, 300);
      }
    }, 35);
  }

  private startPlanAnimation() {
    this.showUserBubble.set(false);
    this.showLufyBubble.set(false);
    this.showPlanCard.set(false);
    this.planItemsVisible.set([]);

    // User bubble
    this.addTimeout(() => {
      this.showUserBubble.set(true);
    }, 200);

    // Lufy bubble
    this.addTimeout(() => {
      this.showLufyBubble.set(true);
    }, 700);

    // Plan card
    this.addTimeout(() => {
      this.showPlanCard.set(true);
    }, 1200);

    // Plan items cascade
    this.demoPlanItems.forEach((_, i) => {
      this.addTimeout(() => {
        this.planItemsVisible.update(arr => [...arr, i]);
      }, 1500 + i * 200);
    });
  }

  private clearSlideAnimations() {
    // Clear typing
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }

    // Reset slide 2 state
    this.typingText.set('');
    this.showTaskCards.set(false);
    this.taskCardsVisible.set([]);

    // Reset slide 3 state
    this.showUserBubble.set(false);
    this.showLufyBubble.set(false);
    this.showPlanCard.set(false);
    this.planItemsVisible.set([]);
  }

  private clearAllAnimations() {
    this.clearSlideAnimations();
    this.animationTimeouts.forEach(t => clearTimeout(t));
    this.animationTimeouts = [];
  }

  private addTimeout(callback: () => void, delay: number) {
    const timeout = setTimeout(callback, delay);
    this.animationTimeouts.push(timeout);
    return timeout;
  }

  // Helper to check if task card should be visible
  isTaskCardVisible(index: number): boolean {
    return this.taskCardsVisible().includes(index);
  }

  // Helper to check if plan item should be visible
  isPlanItemVisible(index: number): boolean {
    return this.planItemsVisible().includes(index);
  }
}
