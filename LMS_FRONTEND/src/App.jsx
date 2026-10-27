import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth, homeFor, ROLE } from './auth/AuthContext'
import { RequireRole, GuestOnly } from './auth/guards'
import { Loading } from './components/ui'

// Each page is loaded only when it is first opened, so the first download stays small.
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const VerifyCertificate = lazy(() => import('./pages/auth/VerifyCertificate'))

const Profile = lazy(() => import('./pages/common/Profile'))
const Notifications = lazy(() => import('./pages/common/Notifications'))
const NotFound = lazy(() => import('./pages/common/NotFound'))
const JoinQuiz = lazy(() => import('./pages/common/JoinQuiz'))

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const MyLearning = lazy(() => import('./pages/student/MyLearning'))
const Catalog = lazy(() => import('./pages/student/Catalog'))
const CourseDetail = lazy(() => import('./pages/student/CourseDetail'))
const CoursePlayer = lazy(() => import('./pages/student/CoursePlayer'))
const StudentQuizzes = lazy(() => import('./pages/student/StudentQuizzes'))
const QuizTake = lazy(() => import('./pages/student/QuizTake'))
const AttemptResult = lazy(() => import('./pages/student/AttemptResult'))
const StudentAssignments = lazy(() => import('./pages/student/StudentAssignments'))
const StudentAssignmentDetail = lazy(() => import('./pages/student/StudentAssignmentDetail'))
const Certificates = lazy(() => import('./pages/student/Certificates'))
const StudentGroups = lazy(() => import('./pages/student/StudentGroups'))

const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const TeacherCourses = lazy(() => import('./pages/teacher/TeacherCourses'))
const CourseEditor = lazy(() => import('./pages/teacher/CourseEditor'))
const QuestionBank = lazy(() => import('./pages/teacher/QuestionBank'))
const LessonLibrary = lazy(() => import('./pages/teacher/LessonLibrary'))
const TeacherQA = lazy(() => import('./pages/teacher/TeacherQA'))
const Announcements = lazy(() => import('./pages/common/Announcements'))
const CalendarPage = lazy(() => import('./pages/common/CalendarPage'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const TeacherQuizzes = lazy(() => import('./pages/teacher/TeacherQuizzes'))
const QuizForm = lazy(() => import('./pages/teacher/QuizForm'))
const QuizResults = lazy(() => import('./pages/teacher/QuizResults'))
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'))
const AssignmentForm = lazy(() => import('./pages/teacher/AssignmentForm'))
const AssignmentSubmissions = lazy(() => import('./pages/teacher/AssignmentSubmissions'))
const Groups = lazy(() => import('./pages/teacher/Groups'))
const GroupForm = lazy(() => import('./pages/teacher/GroupForm'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'))

const { ADMIN, TEACHER, STUDENT } = ROLE

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

// Links like /courses/5 in notifications open the right page for each role.
function CourseLink() {
  const { id } = useParams()
  const { user } = useAuth()
  return <Navigate to={user?.role === STUDENT ? `/catalog/${id}` : `/teacher/courses/${id}`} replace />
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify" element={<VerifyCertificate />} />
      <Route path="/verify/:code" element={<VerifyCertificate />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Any logged-in user */}
      <Route element={<RequireRole />}>
        <Route path="/dashboard" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/courses/:id" element={<CourseLink />} />
        <Route path="/join" element={<JoinQuiz />} />
        <Route path="/join/:code" element={<JoinQuiz />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>

      <Route element={<RequireRole roles={[STUDENT]} />}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/learning" element={<MyLearning />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/catalog/:id" element={<CourseDetail />} />
        <Route path="/learn/:courseId" element={<CoursePlayer />} />
        <Route path="/learn/:courseId/:lessonId" element={<CoursePlayer />} />
        <Route path="/student/quizzes" element={<StudentQuizzes />} />
        <Route path="/quiz/:id/take" element={<QuizTake />} />
        <Route path="/attempts/:id" element={<AttemptResult />} />
        <Route path="/student/assignments" element={<StudentAssignments />} />
        <Route path="/student/assignments/:id" element={<StudentAssignmentDetail />} />
        <Route path="/student/certificates" element={<Certificates />} />
        <Route path="/student/groups" element={<StudentGroups />} />
      </Route>

      <Route element={<RequireRole roles={[TEACHER]} />}>
        <Route path="/teacher" element={<TeacherDashboard />} />
      </Route>

      {/* Teacher pages; an admin may open them too (the backend allows admins to manage any course). */}
      <Route element={<RequireRole roles={[TEACHER, ADMIN]} />}>
        <Route path="/teacher/courses" element={<TeacherCourses />} />
        <Route path="/teacher/courses/new" element={<CourseEditor />} />
        <Route path="/teacher/courses/:id" element={<CourseEditor />} />
        <Route path="/teacher/lessons" element={<LessonLibrary />} />
        <Route path="/teacher/qa" element={<TeacherQA />} />
        <Route path="/teacher/questions" element={<QuestionBank />} />
        <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
        <Route path="/teacher/quizzes/new" element={<QuizForm />} />
        <Route path="/teacher/quizzes/:id/edit" element={<QuizForm />} />
        <Route path="/teacher/quizzes/:id/results" element={<QuizResults />} />
        <Route path="/teacher/assignments" element={<TeacherAssignments />} />
        <Route path="/teacher/assignments/new" element={<AssignmentForm />} />
        <Route path="/teacher/assignments/:id/edit" element={<AssignmentForm />} />
        <Route path="/teacher/assignments/:id" element={<AssignmentSubmissions />} />
        <Route path="/teacher/groups" element={<Groups />} />
        <Route path="/teacher/groups/new" element={<GroupForm />} />
        <Route path="/teacher/groups/:id" element={<GroupForm />} />
      </Route>

      <Route element={<RequireRole roles={[ADMIN]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  )
}
