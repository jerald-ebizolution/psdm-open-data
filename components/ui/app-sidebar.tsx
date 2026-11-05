'use client'

import {
  Sidebar,
  SidebarContent,
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
import { ChevronRight } from "lucide-react"
import { usePathname } from 'next/navigation'
import Image from "next/image"
import Link from 'next/link'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible"

export function AppSidebar() {
  const pathName = usePathname()

  const isPathActive = (url: string) => {
    if (url && pathName === url) {
      return true;
    }
    return false;
  };
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <p className="flex items-center gap-3 text-md font-medium tracking-wide text-muted-foreground uppercase ">
              <Image src="/philgeps-logo.png" alt="PSDBM Logo" width={70} height={70} />
              PSDBM Open Data
            </p>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>

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
                    const isSubGroupActive = item.subItems?.some((subItem) => subItem.subItems?.some((subSubItem) => isPathActive(subSubItem.url)));
                    return (
                      <SidebarMenuItem key={item.title} className="mb-2">
                        <Collapsible
                          defaultOpen={isSubGroupActive}
                          className="group/collapsible"
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              className={`py-5 text-[#545A6D] hover:text-[#313D85]! ${isSubGroupActive && "text-[#313D85]"}`}
                            >
                              <ItemIcon />
                              <span className="">{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems?.map((subItem) => {
                                const SubItemIcon = subItem.icon
                                const isSubGroupActive = subItem.subItems?.some((subSubItem) => isPathActive(subSubItem.url));
                                return (
                                  <SidebarMenuSubItem className="mt-1" key={subItem.title}>
                                    <Collapsible
                                      defaultOpen={isSubGroupActive}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <SidebarMenuSubButton 
                                          className={`py-5 text-[#545A6D] hover:text-[#313D85]! ${isSubGroupActive && "text-[#313D85]"}`}
                                        >
                                          <SubItemIcon className="shrink-0" />
                                          <span className="">{subItem.title}</span>
                                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuSubButton>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <SidebarMenuSub>
                                          {subItem.subItems?.map((subSubItem) => {
                                            const SubSubItemIcon = subSubItem.icon
                                            return (
                                              <SidebarMenuSubItem className="mt-1" key={subSubItem.title}>
                                                <SidebarMenuSubButton
                                                  asChild
                                                  className={`py-5 text-[#545A6D] hover:text-[#313D85]! ${isPathActive(subSubItem.url) && "text-[#313D85]"}`}
                                                >
                                                  <Link href={`${subSubItem.url || ""}`}>
                                                    <SubSubItemIcon className="shrink-0" />
                                                    <span className="">{subSubItem.title}</span>
                                                  </Link>
                                                </SidebarMenuSubButton>
                                              </SidebarMenuSubItem>
                                            )
                                          })}
                                        </SidebarMenuSub>
                                      </CollapsibleContent>
                                    </Collapsible>
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
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))
        }

      </SidebarContent>
      {/* <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User2 /> Username
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter> */}
    </Sidebar>
  )
}