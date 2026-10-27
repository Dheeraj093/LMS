import api from '../../api/client'

// Small helpers shared by the course editor files.

// The body PUT /courses/{id} expects, built from a CourseResponse.
// CourseRequest.modules REPLACES the course's modules, so the current module ids are always sent.
export function courseRequest(course, patch = {}) {
  return {
    title: course.title,
    description: course.description || '',
    categoryId: course.category,
    modules: course.moduleIds || [],
    published: !!course.published,
    thumbnail: course.thumbnail || null,
    ...patch,
  }
}

// Saves course fields. Reads the course again first so the latest module list (changed by the builder) is sent back.
export async function saveCourse(id, patch) {
  const fresh = (await api.get(`/courses/${id}`)).data
  return (await api.put(`/courses/${id}`, courseRequest(fresh, patch))).data
}

// The body PUT /lessons/{id} expects, built from a LessonResponse.
// Uploaded files must be sent again (videoFileId / pdfFileId): a null id removes the file from the lesson.
export function lessonRequest(lesson, patch = {}) {
  return {
    title: lesson.title,
    contentType: lesson.contentType || 'TEXT',
    videoUrl: lesson.videoFileId ? null : lesson.videoUrl || null,
    pdfUrl: lesson.pdfFileId ? null : lesson.pdfUrl || null,
    videoFileId: lesson.videoFileId || null,
    pdfFileId: lesson.pdfFileId || null,
    content: lesson.content || '',
    duration: lesson.duration ?? 0,
    published: !!lesson.published,
    ...patch,
  }
}

// The body PUT /structure expects, from the builder's module list.
export function structureRequest(modules) {
  return { modules: modules.map((m) => ({ moduleId: m.id, lessonIds: m.lessons.map((l) => l.id) })) }
}
