
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { Film, Image as ImageIcon, Link as LinkIcon, Trash2, PlusCircle, Loader2 } from "lucide-react";
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
import type { ContentSettings, Banner } from "@/lib/types";
import { updateContent, deleteContentAsset, addBanner, deleteBanner } from "@/app/actions/content.actions";
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
import { Separator } from "../ui/separator";

interface ContentManagementFormProps {
    initialData: ContentSettings | null;
}

export function ContentManagementForm({ initialData }: ContentManagementFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  
  const [videoPreview, setVideoPreview] = React.useState<string | null>(initialData?.smallVideoUrl || null);
  const [newBannerFile, setNewBannerFile] = React.useState<File | null>(null);
  const [newBannerPreview, setNewBannerPreview] = React.useState<string | null>(null);

  const form = useForm<ContentManagementFormValues>({
    resolver: zodResolver(contentManagementSchema),
    defaultValues: {
      youtubeUrl: initialData?.youtubeUrl || "",
    },
  });
  
  React.useEffect(() => {
    setVideoPreview(initialData?.smallVideoUrl || null);
    form.reset({
        youtubeUrl: initialData?.youtubeUrl || ''
    });
  }, [initialData, form]);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("smallVideoFile", file, { shouldValidate: true });
    }
  };

  const handleNewBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setNewBannerFile(file);
    }
  };

  const handleAddBanner = async () => {
    if (!newBannerFile) {
        toast({ variant: 'destructive', title: 'No file selected', description: 'Please choose a banner image to upload.' });
        return;
    }
    setIsSubmitting(true);
    try {
        const { downloadUrl, storagePath } = await uploadFile(newBannerFile, 'content');
        const result = await addBanner({ imageUrl: downloadUrl, imagePath: storagePath });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
        } else {
            toast({ title: 'Success', description: 'New banner has been added.' });
            setNewBannerFile(null);
            setNewBannerPreview(null);
            router.refresh();
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload file." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteBanner = async (bannerId: string) => {
    setIsDeleting(bannerId);
    const result = await deleteBanner(bannerId);
    if (result.error) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
    } else {
        toast({ title: 'Success!', description: result.success });
        router.refresh();
    }
    setIsDeleting(null);
  };
  
  const handleDeleteVideo = async () => {
    setIsDeleting('video');
    const result = await deleteContentAsset({ assetType: 'video' });
    if (result.error) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
    } else {
        toast({ title: 'Success!', description: result.success });
        setVideoPreview(null);
        form.setValue('smallVideoFile', null);
        router.refresh();
    }
    setIsDeleting(null);
  };


  async function onSubmit(data: ContentManagementFormValues) {
    setIsSubmitting(true);
    
    try {
        let smallVideoUrl = initialData?.smallVideoUrl || '';
        let smallVideoPath = initialData?.smallVideoPath || '';
        if (data.smallVideoFile) {
            const uploadResult = await uploadFile(data.smallVideoFile, 'content');
            smallVideoUrl = uploadResult.downloadUrl;
            smallVideoPath = uploadResult.storagePath;
        }

        const payload = {
            youtubeUrl: data.youtubeUrl || '',
            smallVideoUrl,
            smallVideoPath,
        };

        const result = await updateContent(payload);
        
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            toast({ title: "Success!", description: "Video settings updated." });
            form.setValue('smallVideoFile', null);
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
                    <h3 className="flex items-center gap-2 font-semibold mb-4"><ImageIcon className="h-5 w-5"/> Carousel Banners</h3>
                    <div className="space-y-4">
                        {initialData?.banners && initialData.banners.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {initialData.banners.map(banner => (
                                    <div key={banner.id} className="relative group">
                                        <Image src={banner.imageUrl} alt="Banner" width={320} height={180} className="rounded-md object-cover aspect-video" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={isDeleting === banner.id}>
                                                        {isDeleting === banner.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this banner.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBanner(banner.id!)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                         <Separator />
                         <div className="p-4 border rounded-lg bg-background">
                            <Label className="font-medium">Add New Banner</Label>
                            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                                <div className="w-full sm:w-1/2 md:w-1/3 aspect-video border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                     {newBannerPreview ? (
                                        <Image src={newBannerPreview} alt="New Banner Preview" width={320} height={180} className="object-contain"/>
                                     ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                     )}
                                </div>
                                <div className="flex-1 space-y-2">
                                     <Input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/webp" 
                                        onChange={handleNewBannerFileChange} 
                                        className="max-w-xs"
                                    />
                                    <FormDescription>Upload a banner image (e.g., 16:9 ratio). Max 5MB.</FormDescription>
                                    <Button type="button" size="sm" onClick={handleAddBanner} disabled={isSubmitting || !newBannerFile}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        {isSubmitting ? 'Uploading...' : 'Add Banner'}
                                    </Button>
                                </div>
                            </div>
                         </div>
                    </div>
                </CardContent>
            </Card>
            
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
                                            onChange={handleVideoFileChange} 
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
                                                    <AlertDialogAction onClick={handleDeleteVideo} disabled={isDeleting === 'video'}>
                                                        {isDeleting === 'video' ? 'Deleting...' : 'Confirm Delete'}
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
                {isSubmitting ? "Saving..." : "Save Video Settings"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
