import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { StudentDocumentsService } from './student-documents.service';

@Controller('student-documents/trash')
export class StudentTrashController {
  constructor(private readonly documents: StudentDocumentsService) {}

  @Get()
  list() {
    return this.documents.listTrash();
  }

  @Post(':docId/restore')
  restore(@Param('docId') docId: string) {
    return this.documents.restoreFromTrash(docId);
  }

  @Delete(':docId')
  permanentlyDelete(@Param('docId') docId: string) {
    return this.documents.permanentlyDelete(docId);
  }

  @Delete()
  empty() {
    return this.documents.emptyTrash();
  }
}
