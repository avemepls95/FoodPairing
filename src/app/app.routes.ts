import { Routes } from '@angular/router';
import { GraphComponent } from './Components/graph/graph.component';
import { MixesComponent } from './Components/mixes/mixes.component';

export const routes: Routes = [
  { path: '', component: GraphComponent },
  { path: 'mixes', component: MixesComponent },
  { path: '**', redirectTo: '' }
];
