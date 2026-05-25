import type { ReactNode } from "react";

interface TitlebarProps {
	children?: ReactNode;
}

export function Titlebar({ children }: TitlebarProps) {
	return (
		<div className="titlebar relative flex h-[45px] shrink-0 items-center bg-neutral-950 border-b border-neutral-800 pr-[140px]">
			{children}
		</div>
	);
}
