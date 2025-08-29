import React from "react"
import { cn } from "@/lib/utils"

interface CustomToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  id?: string
}

const CustomToggle: React.FC<CustomToggleProps> = ({
  checked,
  onCheckedChange,
  className,
  id
}) => {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={cn("flex items-center", className)}>
      <input
        type="checkbox"
        id={toggleId}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="hidden"
      />
      <label
        htmlFor={toggleId}
        className={cn("toggleSwitch", checked && "toggleSwitch--checked")}
      />
    </div>
  )
}

export { CustomToggle }
