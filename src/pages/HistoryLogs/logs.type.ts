export type FileLogsType = {
    uuid: string;
    user: string;
    student_name: string;
    file_action: string;
    file_modified: string;
    file_loc: string;
    date_modified: string;
}

export type ActivityLogsType = { 
    uuid: string; 
    user: string; 
    action: string;
    date_modified: string;
} 