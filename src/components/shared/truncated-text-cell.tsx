
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TruncatedTextCellProps {
  text: string;
  maxLength?: number;
  title: string;
}

export function TruncatedTextCell({
  text,
  maxLength = 150, // Default max length before truncating
  title,
}: TruncatedTextCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) {
    return <span className="text-muted-foreground italic">N/A</span>;
  }

  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? `${text.substring(0, maxLength)}...` : text;

  return (
    <div className="flex flex-col items-start">
      <span className="break-words">{displayText}</span>
      {isTruncated && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1 text-primary hover:text-primary/80">
              View More
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4 my-4">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                {text}
                </p>
            </ScrollArea>
            <div className="flex justify-end">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
