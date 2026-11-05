'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { SIDEBAR_DATA } from "@/lib/side-bar-menus"
import {  ChevronRight, User2 } from "lucide-react"
import { usePathname } from 'next/navigation'
import Image from "next/image"
import Link from 'next/link'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible"

export function AppSidebar() {
  const pathName = usePathname()
  
  const isPathActive = (url: string) =>
    url ? pathName === url : false;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <p className="flex items-center gap-3 text-md font-medium tracking-wide text-muted-foreground uppercase ">
              <Image src="/philgeps-logo.png" alt="PSDBM Logo" width={70} height={70} />
               {/* PSDBM Open Data Portal */}
            </p>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>

      {/* {SIDE_BAR_MENU.map((sidebar) => (
        <SidebarMenuItem key={sidebar.name}>
          <SidebarMenuButton render={<a href={sidebar.url} />} isActive={isPathActive(sidebar.url)}>
            <sidebar.icon size={20} className="text-xl" />
            <span className="text-lg">{sidebar.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))} */}
      {
        SIDEBAR_DATA.navMain.admin.map((group) => (
          <SidebarGroup 
            key={group.id} 
            title={group.title}
          >
            <SidebarMenu>
              {group.items.map((item) => {
                const ItemIcon = item.icon
                const hasSubItems = Boolean(item.subItems?.length)

                if (hasSubItems) {
                  const isSubGroupActive = item.subItems?.some((subItem) =>
                    isPathActive(subItem.url),
                  )

                  return (
                    <SidebarMenuItem key={item.title} className="mb-2">
                      <Collapsible
                        defaultOpen={isSubGroupActive}
                        className="group/collapsible"
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            // isActive={isSubGroupActive}
                            className={`py-5 text-[#545A6D] hover:text-[#313D85]! ${isSubGroupActive && "text-[#313D85]"}`}
                          >
                            <ItemIcon className="shrink-0 " />
                            <span className="">{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems?.map((subItem) => {
                              return (
                              <SidebarMenuSubItem className="mt-1" key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  // isActive={isPathActive(subItem.url)}
                                  className={`py-5 text-[#545A6D] hover:text-[#313D85]! ${isPathActive(subItem.url) && "text-[#313D85]"}`}
                                >
                                  <Link href={`${subItem.url || ""}`}>
                                    <span className="">{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )
                }

                if (!item.url) {
                  return null
                }
                return (
                <SidebarMenuItem key={item.title} className="mb-2">
                  <SidebarMenuButton
                    asChild
                    className={`py-5 text-[#545A6D] hover:text-[#313D85]! ${isPathActive(item.url || '') && "text-[#313D85]"}`}
                  >
                    <Link href={item.url || ""} >
                      <item.icon size={30} className="text-xl " />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )})}
            </SidebarMenu>
          </SidebarGroup>
        ))
      }
   
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User2 /> Username
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}