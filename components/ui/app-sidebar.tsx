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
  useSidebar,
} from "@/components/ui/sidebar"
import { SIDEBAR_DATA } from "@/lib/side-bar-menus"
import { ChevronRight } from "lucide-react"
import { usePathname } from 'next/navigation'
import Image from "next/image"
import Link from 'next/link'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible"

export function AppSidebar() {
  const pathName = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

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
            <p className="flex items-center gap-2.5 px-1 py-1.5 text-xs font-semibold tracking-wider text-gray-700 uppercase">
              <Image src="/philgeps-logo.png" alt="PSDBM Logo" width={36} height={36} />
              PSDBM Open Data
            </p>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        // On mobile the sidebar is a drawer: close it once a page link is tapped.
        onClickCapture={(e) => {
          if (isMobile && (e.target as HTMLElement).closest("a[href]")) setOpenMobile(false)
        }}
      >

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
                      <SidebarMenuItem key={item.title} className="mb-0.5">
                        <Collapsible
                          defaultOpen={isSubGroupActive}
                          className="group/collapsible"
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              className={`h-9 text-[12px] text-[#545A6D] hover:text-[#313D85]! ${isSubGroupActive && "bg-[#313D85]/[0.07] font-medium text-[#313D85]"}`}
                            >
                              <ItemIcon />
                              <span className="text-[12px]">{item.title}</span>
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
                                          className={`h-9 text-[12px] text-[#545A6D] hover:text-[#313D85]! ${isSubGroupActive && "bg-[#313D85]/[0.07] font-medium text-[#313D85]"}`}
                                        >
                                          <SubItemIcon className="shrink-0" />
                                          <span className="text-[12px]">{subItem.title}</span>
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
                                                  className={`h-9 text-[12px] text-[#545A6D] hover:text-[#313D85]! ${isPathActive(subSubItem.url) && "bg-[#313D85]/[0.07] font-medium text-[#313D85]"}`}
                                                >
                                                  <Link href={`${subSubItem.url || ""}`}>
                                                    <SubSubItemIcon className="shrink-0" />
                                                    <span className="text-[12px]">{subSubItem.title}</span>
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
                    <SidebarMenuItem key={item.title} className="mb-0.5">
                      <SidebarMenuButton
                        asChild
                        className={`h-9 text-[12px] text-[#545A6D] hover:text-[#313D85]! ${isPathActive(item.url || '') && "bg-[#313D85]/[0.07] font-medium text-[#313D85]"}`}
                      >
                        <Link href={item.url || ""} >
                          <item.icon />
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