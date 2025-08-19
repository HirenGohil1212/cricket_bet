
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import Image from "next/image";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sports, type Player } from "@/lib/types";
import { createPlayer } from "@/app/actions/player.actions";
import { uploadFile } from "@/lib/storage";
import { z } from "zod";

const playerFormSchema = z.object({
  name: z.string().min(2, "Player name must be at least 2 characters."),
  sport: z.enum(sports, { required_error: "Please select a sport." }),
  playerImageFile: z.any()
    .refine((file) => file instanceof File, "Player image is required.")
    .refine((file) => !(file instanceof File) || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine((file) => !(file instanceof File) || ["image/jpeg", "image/png", "image/webp"].includes(file.type), ".jpg, .png and .webp files are accepted."),
});

type PlayerFormValues = z.infer<typeof playerFormSchema>;

interface AddPlayerFormProps {
    onPlayerAdded: (newPlayer: Player) => void;
}

export function AddPlayerForm({ onPlayerAdded }: AddPlayerFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      name: "",
      sport: "Cricket",
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("playerImageFile", file, { shouldValidate: true });
    }
  };

  async function onSubmit(data: PlayerFormValues) {
    setIsSubmitting(true);
    try {
      const { downloadUrl, storagePath } = await uploadFile(data.playerImageFile, 'players');
      const result = await createPlayer({ 
        name: data.name, 
        sport: data.sport, 
        imageUrl: downloadUrl,
        imagePath: storagePath 
      });

      if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      } else {
        toast({ title: "Player Added", description: `${data.name} has been added to the list.` });
        onPlayerAdded({ 
            id: result.id,
            name: data.name,
            sport: data.sport,
            imageUrl: downloadUrl, 
            imagePath: storagePath
        }); // Notify parent component
        form.reset();
        setPreview(null);
        // Reset the file input visually
        const input = document.getElementById('playerImageFile') as HTMLInputElement;
        if (input) {
            input.value = '';
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Player Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Virat Kohli" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sport"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sport</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sports.map((sport) => (
                    <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="playerImageFile"
          render={() => (
            <FormItem>
              <FormLabel>Player Image</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                    {preview ? (
                      <Image src={preview} alt="Player Preview" width={96} height={96} className="object-contain" />
                    ) : (
                      <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <Input
                    id="playerImageFile"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => handleFileChange(e)}
                    className="max-w-xs"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Adding..." : "Add Player"}
        </Button>
      </form>
    </Form>
  )
}
