
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sports, type DummyUser } from "@/lib/types";
import { createDummyUser } from "@/app/actions/dummy-user.actions";
import { z } from "zod";

const dummyUserFormSchema = z.object({
  name: z.string().min(2, "Dummy user name must be at least 2 characters."),
  sport: z.enum(sports, { required_error: "Please select a sport." }),
});

type DummyUserFormValues = z.infer<typeof dummyUserFormSchema>;

interface AddDummyUserFormProps {
    onDummyUserAdded: (newDummyUser: DummyUser) => void;
}

export function AddDummyUserForm({ onDummyUserAdded }: AddDummyUserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<DummyUserFormValues>({
    resolver: zodResolver(dummyUserFormSchema),
    defaultValues: {
      name: "",
      sport: "Cricket",
    }
  });

  async function onSubmit(data: DummyUserFormValues) {
    setIsSubmitting(true);
    try {
      const result = await createDummyUser({ 
        name: data.name, 
        sport: data.sport, 
      });

      if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      } else {
        toast({ title: "Dummy User Added", description: `${data.name} has been added to the list.` });
        onDummyUserAdded({ 
            id: result.id!,
            name: data.name,
            sport: data.sport,
        });
        form.reset();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message || "Could not add dummy user. Please try again." });
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
              <FormLabel>Dummy User Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. House Account" {...field} />
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
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Adding..." : "Add Dummy User"}
        </Button>
      </form>
    </Form>
  )
}
