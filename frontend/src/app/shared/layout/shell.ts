import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header';
import { NavItem } from '../components/nav-item/nav-item';
import { UserAccount } from '../components/user-account/user-account';
import { GoalsSection } from '../components/goals-section/goals-section';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Header, NavItem, UserAccount, GoalsSection],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class Shell {
  protected sidebarOpen = signal(false);
  protected aiPanelOpen = signal(false);

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
