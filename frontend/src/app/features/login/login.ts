import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import lottie from 'lottie-web';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  @ViewChild('lottieContainer') lottieContainer!: ElementRef;

  ngAfterViewInit() {
    lottie.loadAnimation({
      container: this.lottieContainer.nativeElement,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'girl-studying.json'
    });
  }
}
