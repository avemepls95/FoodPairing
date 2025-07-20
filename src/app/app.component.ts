import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GraphComponent } from './Components/graph/graph.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GraphComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'FoodPairingHookahFrontend';
}
