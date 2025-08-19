
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { Film, Image as ImageIcon, Link as LinkIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { contentManagementSchema, type ContentManagementFormValues } from "@/lib/schemas";
import type { ContentSettings } from "@/lib/types";
import { updateContent, deleteContentAsset } from "@/app/actions/content.actions";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFile } from "@/lib/storage";
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
} from "@/components/ui/alert-dialog";

interface ContentManagementFormProps {
    initialData: ContentSettings | null;
}

export function ContentManagementForm({ initialData }: ContentManagementFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(initialData?.bannerImageUrl || null);
  const [videoPreview, setVideoPreview] = React.useState<string | null>(initialData?.smallVideoUrl || null);

  const form = useForm<ContentManagementFormValues>({
    resolver: zodResolver(contentManagementSchema),
    defaultValues: {
      youtubeUrl: initialData?.youtubeUrl || "",
    },
  });
  
  React.useEffect(() => {
    setBannerPreview(initialData?.bannerImageUrl || null);
    setVideoPreview(initialData?.smallVideoUrl || null);
    form.reset({
        youtubeUrl: initialData?.youtubeUrl || ''
    });
  }, [initialData, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "bannerImageFile" | "smallVideoFile") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue(fieldName, file, { shouldValidate: true });
        
        if (fieldName === 'bannerImageFile') {
            setBannerPreview(result);
        } else if (fieldName === 'smallVideoFile') {
            setVideoPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleDelete = async (assetType: 'banner' | 'video') => {
    setIsDeleting(true);
    const result = await deleteContentAsset({ assetType });
    if (result.error) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
    } else {
        toast({ title: 'Success!', description: result.success });
        if (assetType === 'banner') {
            setBannerPreview(null);
            form.setValue('bannerImageFile', null);
        } else {
            setVideoPreview(null);
            form.setValue('smallVideoFile', null);
        }
        router.refresh();
    }
    setIsDeleting(false);
  };


  async function onSubmit(data: ContentManagementFormValues) {
    setIsSubmitting(true);
    
    try {
        let bannerImageUrl = initialData?.bannerImageUrl || '';
        let bannerImagePath = initialData?.bannerImagePath || '';
        if (data.bannerImageFile) {
            const uploadResult = await uploadFile(data.bannerImageFile, 'content');
            bannerImageUrl = uploadResult.downloadUrl;
            bannerImagePath = uploadResult.storagePath;
        }

        let smallVideoUrl = initialData?.smallVideoUrl || '';
        let smallVideoPath = initialData?.smallVideoPath || '';
        if (data.smallVideoFile) {
            const uploadResult = await uploadFile(data.smallVideoFile, 'content');
            smallVideoUrl = uploadResult.downloadUrl;
            smallVideoPath = uploadResult.storagePath;
        }

        const payload = {
            youtubeUrl: data.youtubeUrl || '',
            bannerImageUrl,
            bannerImagePath,
            smallVideoUrl,
            smallVideoPath,
        };

        const result = await updateContent(payload);
        
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            toast({ title: "Success!", description: result.success });
            router.refresh();
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload files. Please try again." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <FormField
                      control={form.control}
                      name="youtubeUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 font-semibold"><LinkIcon className="h-5 w-5"/> YouTube Video Link</FormLabel>
                          <FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl>
                          <FormDescription>This video might be shown on the home page or other promotional areas.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </CardContent>
            </Card>

            <Card>
                 <CardContent className="pt-6">
                     <FormField
                        control={form.control}
                        name="bannerImageFile"
                        render={() => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2 font-semibold"><ImageIcon className="h-5 w-5"/> Banner Image</FormLabel>
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                {bannerPreview && (
                                     <div className="w-full sm:w-1/2 md:w-1/3 aspect-video border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                        <Image src={bannerPreview} alt="Banner Preview" width={320} height={180} className="object-contain"/>
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            accept="image/png, image/jpeg, image/webp" 
                                            onChange={(e) => handleFileChange(e, 'bannerImageFile')} 
                                            className="max-w-xs"
                                        />
                                    </FormControl>
                                    <FormDescription>Upload a banner image (e.g., 16:9 ratio). Max 5MB.</FormDescription>
                                     {bannerPreview && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button type="button" variant="destructive" size="sm" className="w-full max-w-xs">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Banner
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the banner image from storage. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete('banner')} disabled={isDeleting}>
                                                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                     )}
                                </div>
                            </div>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Card>
                 <CardContent className="pt-6">
                     <FormField
                        control={form.control}
                        name="smallVideoFile"
                        render={() => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2 font-semibold"><Film className="h-5 w-5"/> Small Video Ad</FormLabel>
                             <div className="flex flex-col sm:flex-row items-start gap-4">
                                {videoPreview && (
                                     <div className="w-full sm:w-1/2 md:w-1/3 aspect-video border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                        <video src={videoPreview} controls className="w-full h-full object-contain" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                     <FormControl>
                                        <Input 
                                            type="file" 
                                            accept="video/mp4" 
                                            onChange={(e) => handleFileChange(e, 'smallVideoFile')} 
                                            className="max-w-xs"
                                        />
                                    </FormControl>
                                    <FormDescription>Upload a short video ad (MP4 format). Max 10MB.</FormDescription>
                                    {videoPreview && (
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button type="button" variant="destructive" size="sm" className="w-full max-w-xs">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Video
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the video from storage. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete('video')} disabled={isDeleting}>
                                                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
        </div>

        <div className="flex items-center justify-end">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Content Changes"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
