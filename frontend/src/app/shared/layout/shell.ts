import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header';
import { NavItem } from '../components/nav-item/nav-item';
import { UserAccount } from '../components/user-account/user-account';
import { GoalsSection } from '../components/goals-section/goals-section';
import { AIChat } from '../components/ai-chat/ai-chat';
import { OnboardingModal } from '../components/onboarding-modal/onboarding-modal';
import { Tasks, Focus, Goals } from '../../core/services';

const ONBOARDING_COMPLETE_KEY = 'helpme_onboarding_complete';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Header, NavItem, UserAccount, GoalsSection, AIChat, OnboardingModal],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class Shell implements OnInit {
  private tasksService = inject(Tasks);
  private focusService = inject(Focus);
  private goalsService = inject(Goals);

  protected sidebarOpen = signal(false);
  protected aiPanelOpen = signal(false);
  protected counts = this.tasksService.counts;
  protected showOnboarding = signal(false);

  private onboardingChecked = false;

  constructor() {
    // Watch for counts to load, then check onboarding
    effect(() => {
      const c = this.counts();
      const goals = this.goalsService.goals();

      // Only check once after data loads
      if (!this.onboardingChecked && c) {
        this.onboardingChecked = true;
        this.checkOnboarding(c, goals);
      }
    });
  }

  ngOnInit() {
    this.tasksService.loadCounts();
    this.focusService.loadActiveSession();
    this.goalsService.loadGoals();
  }

  private checkOnboarding(counts: { today: number; week: number; someday: number; overdue: number }, goals: any[]) {
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);

    // Show onboarding if:
    // 1. Not completed before, OR
    // 2. User has no tasks and no goals (empty state)
    const totalTasks = (counts.today || 0) + (counts.week || 0) + (counts.someday || 0);
    const hasNoData = totalTasks === 0 && (!goals || goals.length === 0);

    if (!completed || hasNoData) {
      setTimeout(() => {
        this.showOnboarding.set(true);
      }, 600);
    }
  }

  onOnboardingComplete() {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    this.showOnboarding.set(false);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  toggleAIPanel() {
    this.aiPanelOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
