"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { Film, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

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
import { updateContent } from "@/app/actions/content.actions";
import { Card, CardContent } from "@/components/ui/card";

interface ContentManagementFormProps {
    initialData: ContentSettings | null;
}

export function ContentManagementForm({ initialData }: ContentManagementFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // State for previews
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(initialData?.bannerImageUrl || null);
  const [videoPreview, setVideoPreview] = React.useState<string | null>(initialData?.smallVideoUrl || null);

  const form = useForm<ContentManagementFormValues>({
    resolver: zodResolver(contentManagementSchema),
    defaultValues: {
      youtubeUrl: initialData?.youtubeUrl || "",
      bannerImageUrl: initialData?.bannerImageUrl || "",
      smallVideoUrl: initialData?.smallVideoUrl || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "bannerImage" | "smallVideo") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue(`${fieldName}DataUri`, result);
        form.setValue(fieldName, file);
        form.clearErrors(fieldName);
        
        if (fieldName === 'bannerImage') {
            setBannerPreview(result);
        } else if (fieldName === 'smallVideo') {
            setVideoPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(data: ContentManagementFormValues) {
    setIsSubmitting(true);
    const result = await updateContent(data);
    
    if (result.error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error,
        });
    } else {
        toast({
            title: "Success!",
            description: result.success,
        });
        // The page will be revalidated by the server action, so we don't need to refresh the router
    }
    setIsSubmitting(false);
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
                        name="bannerImage"
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
                                            onChange={(e) => handleFileChange(e, 'bannerImage')} 
                                            className="max-w-xs"
                                        />
                                    </FormControl>
                                    <FormDescription>Upload a banner image (e.g., 16:9 ratio). Max 5MB.</FormDescription>
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
                        name="smallVideo"
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
                                            onChange={(e) => handleFileChange(e, 'smallVideo')} 
                                            className="max-w-xs"
                                        />
                                    </FormControl>
                                    <FormDescription>Upload a short video ad (MP4 format). Max 10MB.</FormDescription>
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
                {isSubmitting ? "Saving..." : "Save Content"}
            </Button>
        </div>
      </form>
    </Form>
  )
}
