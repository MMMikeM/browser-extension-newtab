# Component Composition

## Contents

- Items always inside their Group component
- Callouts use Alert
- Empty states use Empty component
- Toast notifications use sonner
- Choosing between overlay components
- Dialog, Sheet, and Drawer always need a Title
- Card structure
- Button has no isPending or isLoading prop
- TabsTrigger must be inside TabsList
- Avatar always needs AvatarFallback
- Use Separator instead of raw hr or border divs
- Use Skeleton for loading placeholders
- Use Badge instead of custom styled spans

---

## Items always inside their Group component

Never render items directly inside the content container.

**Incorrect:**

```tsx
<SelectContent>
  <SelectItem value="apple">Apple</SelectItem>
  <SelectItem value="banana">Banana</SelectItem>
</SelectContent>
```

**Correct:**

```tsx
<SelectContent>
  <SelectGroup>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
  </SelectGroup>
</SelectContent>
```

This applies to all group-based components:

| Item                                                       | Group               |
| ---------------------------------------------------------- | ------------------- |
| `SelectItem`, `SelectLabel`                                | `SelectGroup`       |
| `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSub` | `DropdownMenuGroup` |
| `MenubarItem`                                              | `MenubarGroup`      |
| `ContextMenuItem`                                          | `ContextMenuGroup`  |
| `CommandItem`                                              | `CommandGroup`      |

---

## Callouts use Alert

```tsx
<Alert>
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Something needs attention.</AlertDescription>
</Alert>
```

---

## Empty states use Empty component

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <FolderIcon />
    </EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Get started by creating a new project.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Create Project</Button>
  </EmptyContent>
</Empty>
```

---

## Toast notifications use sonner

```tsx
import { toast } from "sonner";

toast.success("Changes saved.");
toast.error("Something went wrong.");
toast("File deleted.", {
  action: { label: "Undo", onClick: () => undoDelete() },
});
```

---

## Choosing between overlay components

| Use case                           | Component     |
| ---------------------------------- | ------------- |
| Focused task that requires input   | `Dialog`      |
| Destructive action confirmation    | `AlertDialog` |
| Side panel with details or filters | `Sheet`       |
| Mobile-first bottom panel          | `Drawer`      |
| Quick info on hover                | `HoverCard`   |
| Small contextual content on click  | `Popover`     |

---

## Dialog, Sheet, and Drawer always need a Title

`DialogTitle`, `SheetTitle`, `DrawerTitle` are required for accessibility. Use `className="sr-only"` if visually hidden.

```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Edit Profile</DialogTitle>
    <DialogDescription>Update your profile.</DialogDescription>
  </DialogHeader>
  ...
</DialogContent>
```

---

## Card structure

Use full composition — don't dump everything into `CardContent`:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Team Members</CardTitle>
    <CardDescription>Manage your team.</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>Invite</Button>
  </CardFooter>
</Card>
```

---

## Button has no isPending or isLoading prop

Compose with `Spinner` + `data-icon` + `disabled`:

```tsx
<Button disabled>
  <Spinner data-icon="inline-start" />
  Saving...
</Button>
```

---

## TabsTrigger must be inside TabsList

Never render `TabsTrigger` directly inside `Tabs` — always wrap in `TabsList`:

```tsx
<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">...</TabsContent>
</Tabs>
```

---

## Avatar always needs AvatarFallback

Always include `AvatarFallback` for when the image fails to load:

```tsx
<Avatar>
  <AvatarImage src="/avatar.png" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

---

## Use existing components instead of custom markup

| Instead of                                         | Use                                  |
| -------------------------------------------------- | ------------------------------------ |
| `<hr>` or `<div className="border-t">`             | `<Separator />`                      |
| `<div className="animate-pulse">` with styled divs | `<Skeleton className="h-4 w-3/4" />` |
| `<span className="rounded-full bg-green-100 ...">` | `<Badge variant="secondary">`        |

---

## Custom triggers use `render`

Use `render` to replace the default element:

```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

Applies to: `DialogTrigger`, `SheetTrigger`, `AlertDialogTrigger`, `DropdownMenuTrigger`, `PopoverTrigger`, `TooltipTrigger`, `CollapsibleTrigger`, `DialogClose`, `SheetClose`, `NavigationMenuLink`, `BreadcrumbLink`, `SidebarMenuButton`, `Badge`, `Item`.

When `render` targets a non-button element (`<a>`, `<span>`), add `nativeButton={false}`:

```tsx
<Button render={<a href="/docs" />} nativeButton={false}>
  Read the docs
</Button>
```

---

## Popup positioning uses `Positioner`

For components with floating content (DropdownMenu, Popover, Tooltip, HoverCard, etc.), positioning props (`side`, `align`) go on the `Positioner`, not the `Content`:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" />}>Open</DropdownMenuTrigger>
  <DropdownMenuPositioner side="left" align="start">
    <DropdownMenuContent>
      <DropdownMenuItem>Profile</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenuPositioner>
</DropdownMenu>
```

## Labels must be inside Group

Menu/dropdown labels must be wrapped in their `Group` component:

```tsx
<DropdownMenuGroup>
  <DropdownMenuLabel>My Account</DropdownMenuLabel>
  <DropdownMenuItem>Profile</DropdownMenuItem>
  <DropdownMenuItem>Billing</DropdownMenuItem>
</DropdownMenuGroup>
```

---

## Component-specific API (base primitives)

### Select — requires `items` prop

```tsx
const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
]

<Select items={items}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectGroup>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
```

- Placeholder: use `{ value: null }` item (not `<SelectValue placeholder="...">`)
- Positioning: `<SelectContent alignItemWithTrigger={false} side="bottom">`
- Multiple: add `multiple` prop, `defaultValue={[]}`
- Object values: add `itemToStringValue={(item) => item.name}`

### ToggleGroup — `multiple` boolean, not `type`

```tsx
// Single — defaultValue is always an array
<ToggleGroup defaultValue={["daily"]}>
  <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
  <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
</ToggleGroup>

// Multi-selection
<ToggleGroup multiple>
  <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
</ToggleGroup>
```

Controlled single value — wrap/unwrap arrays:

```tsx
const [value, setValue] = React.useState("normal")
<ToggleGroup value={[value]} onValueChange={(v) => setValue(v[0])}>
```

### Slider — scalar defaultValue, not array

```tsx
<Slider defaultValue={50} max={100} step={1} />
```

Arrays only for range sliders. Controlled `onValueChange` may need a cast: `setValue(v as number[])`.

### Accordion — no `type`, no `collapsible`

```tsx
<Accordion defaultValue={["item-1"]}>
  <AccordionItem value="item-1">...</AccordionItem>
</Accordion>

// Multi-select
<Accordion multiple defaultValue={["item-1", "item-2"]}>
```
