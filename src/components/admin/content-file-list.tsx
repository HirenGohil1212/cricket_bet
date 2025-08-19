
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Terminal, Trash2, Image as ImageIcon, Video } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteContentFileByPath } from "@/app/actions/content.actions";

interface ContentFile {
    name: string;
    url: string;
    fullPath: string;
}

interface ContentFileListProps {
  initialFiles: ContentFile[];
  error?: string | null;
}

export function ContentFileList({ initialFiles, error }: ContentFileListProps) {
  const [files, setFiles] = useState(initialFiles);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  
  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Files</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const handleDelete = async (path: string) => {
    setIsDeleting(path);
    const result = await deleteContentFileByPath(path);
    if (result.error) {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
    } else {
      toast({ title: "Success", description: result.success });
      setFiles((prevFiles) => prevFiles.filter((file) => file.fullPath !== path));
    }
    setIsDeleting(null);
  };
  
  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'webm'].includes(extension || '')) {
      return <Video className="h-5 w-5 text-muted-foreground" />;
    }
    return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
     <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>File Name</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length > 0 ? (
                files.map((file) => (
                    <TableRow key={file.fullPath}>
                        <TableCell>{getFileTypeIcon(file.name)}</TableCell>
                        <TableCell>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline truncate block max-w-xs md:max-w-md lg:max-w-lg">
                                {file.name}
                            </a>
                        </TableCell>
                        <TableCell className="text-right">
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isDeleting === file.fullPath}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the file <span className="font-semibold">{file.name}</span> from storage.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(file.fullPath)}
                                    className="bg-destructive hover:bg-destructive/90"
                                    disabled={isDeleting === file.fullPath}
                                  >
                                    {isDeleting === file.fullPath ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No uploaded content files found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
     </div>
  );
}
