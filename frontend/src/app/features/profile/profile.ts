import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private userService = inject(UserService);

  user = this.userService.user;
  loading = this.userService.loading;

  agentInstructions = signal('');
  saving = signal(false);
  saved = signal(false);

  ngOnInit() {
    this.userService.loadUser().then(() => {
      const user = this.user();
      if (user?.settings?.agent_instructions) {
        this.agentInstructions.set(user.settings.agent_instructions);
      }
    });
  }

  getInitials(): string {
    return this.userService.getInitials();
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  async saveInstructions() {
    this.saving.set(true);
    this.saved.set(false);

    try {
      await this.userService.updateSettings({
        agent_instructions: this.agentInstructions()
      });
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    } catch (err) {
      console.error('Failed to save instructions:', err);
    } finally {
      this.saving.set(false);
    }
  }

  onInstructionsChange(value: string) {
    this.agentInstructions.set(value);
  }
}
