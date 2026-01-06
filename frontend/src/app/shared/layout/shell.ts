import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header';
import { NavItem } from '../components/nav-item/nav-item';
import { UserAccount } from '../components/user-account/user-account';
import { GoalsSection } from '../components/goals-section/goals-section';
import { AIChat } from '../components/ai-chat/ai-chat';
import { Tasks, Focus } from '../../core/services';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Header, NavItem, UserAccount, GoalsSection, AIChat],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class Shell implements OnInit {
  private tasksService = inject(Tasks);
  private focusService = inject(Focus);

  protected sidebarOpen = signal(false);
  protected aiPanelOpen = signal(false);
  protected counts = this.tasksService.counts;

  ngOnInit() {
    this.tasksService.loadCounts();
    this.focusService.loadActiveSession();
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
