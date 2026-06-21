
import { redirect } from 'next/navigation';

export default function LecturerRoot() {
  redirect('/lecturer/exam-schedules');
}