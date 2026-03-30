import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Workout from './pages/Workout.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/workout" element={<Workout />} />
      </Routes>
    </Router>
  );
}
