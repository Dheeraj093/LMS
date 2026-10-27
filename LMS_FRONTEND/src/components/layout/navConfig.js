import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import { ROLE } from '../../auth/AuthContext'

// Top navigation per role. "extra" items show in the avatar menu and the mobile drawer.
export const NAV = {
  [ROLE.STUDENT]: {
    main: [
      { to: '/student', label: 'Dashboard', icon: SpaceDashboardOutlinedIcon, exact: true },
      { to: '/student/learning', label: 'My learning', icon: MenuBookOutlinedIcon, also: ['/learn'] },
      { to: '/catalog', label: 'Catalog', icon: ExploreOutlinedIcon },
      { to: '/student/quizzes', label: 'Quizzes', icon: QuizOutlinedIcon, also: ['/quiz/', '/attempts/'] },
      { to: '/student/assignments', label: 'Assignments', icon: AssignmentOutlinedIcon },
      { to: '/calendar', label: 'Calendar', icon: CalendarMonthOutlinedIcon },
    ],
    extra: [
      { to: '/announcements', label: 'Announcements', icon: CampaignOutlinedIcon },
      { to: '/student/certificates', label: 'Certificates', icon: WorkspacePremiumOutlinedIcon },
      { to: '/student/groups', label: 'My groups', icon: GroupsOutlinedIcon },
    ],
    search: { placeholder: 'Search courses', to: (q) => `/catalog?search=${encodeURIComponent(q)}` },
  },
  [ROLE.TEACHER]: {
    main: [
      { to: '/teacher', label: 'Dashboard', icon: SpaceDashboardOutlinedIcon, exact: true },
      { to: '/teacher/courses', label: 'Courses', icon: MenuBookOutlinedIcon },
      { to: '/teacher/lessons', label: 'Lessons', icon: VideoLibraryOutlinedIcon },
      { to: '/teacher/quizzes', label: 'Quizzes', icon: QuizOutlinedIcon },
      { to: '/teacher/assignments', label: 'Grading', icon: AssignmentOutlinedIcon },
      { to: '/teacher/qa', label: 'Q&A', icon: ForumOutlinedIcon },
      { to: '/teacher/questions', label: 'Question bank', icon: HelpOutlineOutlinedIcon },
      { to: '/teacher/groups', label: 'Groups', icon: GroupsOutlinedIcon },
      { to: '/announcements', label: 'Announcements', icon: CampaignOutlinedIcon },
      { to: '/calendar', label: 'Calendar', icon: CalendarMonthOutlinedIcon },
    ],
    extra: [],
    search: { placeholder: 'Search my courses', to: (q) => `/teacher/courses?search=${encodeURIComponent(q)}` },
  },
  [ROLE.ADMIN]: {
    main: [
      { to: '/admin', label: 'Dashboard', icon: SpaceDashboardOutlinedIcon, exact: true },
      { to: '/admin/users', label: 'Users', icon: PeopleAltOutlinedIcon },
      { to: '/admin/categories', label: 'Categories', icon: CategoryOutlinedIcon },
      { to: '/admin/courses', label: 'Courses', icon: MenuBookOutlinedIcon, also: ['/teacher/courses'] },
      { to: '/teacher/lessons', label: 'Lessons', icon: VideoLibraryOutlinedIcon },
    ],
    extra: [],
    search: { placeholder: 'Search users', to: (q) => `/admin/users?search=${encodeURIComponent(q)}` },
  },
}

export function isActive(item, pathname) {
  if (item.exact) return pathname === item.to
  return pathname === item.to || pathname.startsWith(item.to + '/') || (item.also || []).some((p) => pathname.startsWith(p))
}
