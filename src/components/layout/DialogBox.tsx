import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


interface DialogTemplateProps {
    title?: string;
	desc?: string;
    open: boolean;
	noBtnName?: string;
	yesBtnName?: string;
	yesBtnStyle?: string;
    onOpenChange: (open: boolean) => void;
    children?: React.ReactNode;
	onClick: () => void;
}

export function DialogBox({
    title,
	desc,
	open,
	noBtnName,
	yesBtnName,
	yesBtnStyle,
	onOpenChange,
	children,
	onClick
}: DialogTemplateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ? title : "Title"}</DialogTitle>
          <DialogDescription>
            {desc ? desc : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Main Content Body */}
        <div className="">{children}</div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
			className={"cursor-pointer"}
          >
            {noBtnName ? noBtnName : "Cancel"}
          </Button>
          <Button 
		  	type="submit" 
			className={cn("cursor-pointer", yesBtnStyle)}
			onClick={() => {
				onClick()
				onOpenChange(false)
			}}
		  >
			{yesBtnName ? yesBtnName : "Confirm"}
		  </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}