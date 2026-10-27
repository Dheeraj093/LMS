package com.example.LMS.model;

// Why a file was uploaded. Decides the allowed types, the size limit and who may open it.
public enum FilePurpose {
    COURSE_THUMBNAIL, AVATAR, LESSON_VIDEO, LESSON_PDF, ASSIGNMENT_FILE;

    // Thumbnails and avatars are shown in the catalog and menus, so anyone may open them.
    public boolean isPublic() {
        return this == COURSE_THUMBNAIL || this == AVATAR;
    }
}
