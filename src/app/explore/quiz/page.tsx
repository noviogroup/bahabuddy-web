import type { Metadata } from 'next'
import IslandQuiz from '@/components/IslandQuiz'

export const metadata: Metadata = {
  title: 'What Bahamas Island Are You? | Baha Buddy',
  description:
    'Take our 5-question island personality quiz and discover which Bahamas island matches your travel style — then plan your trip with AI.',
  openGraph: {
    title: 'What Bahamas Island Are You? — Island Quiz | Baha Buddy',
    description: 'Answer 5 questions and get matched to your perfect Bahamian island escape.',
  },
}

export default function IslandQuizPage() {
  return <IslandQuiz />
}
