import { FileJsonIcon, Gavel, GitFork, Home, Landmark, LeafIcon, LucideIcon, NetworkIcon, ShieldAlert, ShoppingBagIcon, StoreIcon, Users } from "lucide-react";

export const SIDE_BAR_MENU = [
  {
    url: "/dashboard",
    icon: Home,
    name: "Dashboard",
    key: "dashboard"
  },
  {
    url: "/transactions",
    icon: Home,
    name: "Transactions",
    key: "transactions"
  },
  {
    url: "/reports",
    icon: Home,
    name: "Reports",
    key: "reports"
  },
]

type NavSubItem = {
  title: string
  url: string
  icon: LucideIcon
  subItems?: NavSubItem[]
}

type NavItem = {
  title: string;
  icon: LucideIcon
  url?: string
  subItems?: NavSubItem[]
}

type NavGroup = {
  id: string
  title: string
  items: NavItem[]
}

export const SIDEBAR_DATA: {
  navMain: { admin: NavGroup[] }
} = {
  navMain: {
    admin: [
      // {
      //   id: 'admin-menu',
      //   title: 'Menu',
      //   items: [
      //     {
      //       title: 'Dashboard',
      //       url: '/dashboard',
      //       icon: HomeIcon,
      //     },

      //   ],
      // },
      {
        id: 'admin',
        title: 'admin',
        items: [
          {
            title: 'Merchant Analytics',
            url: '/merchant-analytics',
            icon: Users,
          },
          {
            title: 'Bids and Awards Analytics',
            url: '/bids-and-awards-analytics',
            icon: Gavel,
          },
          {
            title: 'Government Agency Analytics',
            url: '/government-agency-analytics',
            icon: Landmark,
          },
          {
            title: 'Observers Analytics',
            url: '/observers-analytics',
            icon: ShieldAlert,
          },
          {
            title: 'eMarketplace Analytics',
            url: '/emarketplace-analytics',
            icon: ShoppingBagIcon,
          },
          {
            title: 'Virtual Store Analytics',
            url: '/virtual-store-analytics',
            icon: StoreIcon,
          },
          {
            title: 'Collusion Monitoring',
            url: '/collusion-monitoring',
            icon: NetworkIcon,
          },
          {
            title: 'Beneficial Ownership',
            url: '/beneficial-ownership',
            icon: GitFork,
          },
          {
            title: 'Green Procurement',
            url: '/green-procurement',
            icon: LeafIcon,
          },
          {
            title: 'OCDS',
            // url: '/ocds',
            icon: FileJsonIcon,
            subItems: [
              {
                title: 'Red Flags',
                url: '',
                icon: FileJsonIcon,
                subItems: [
                  {
                    title: 'R003',
                    url: '/ocds/red-flags/r003',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'R059',
                    url: '/ocds/red-flags/r059',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'R060',
                    url: '/ocds/red-flags/r060',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'R061',
                    url: '/ocds/red-flags/r061',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'R062',
                    url: '/ocds/red-flags/r062',
                    icon: FileJsonIcon,
                  },
                ],
              },
              {
                title: 'Indicators',
                url: '/ocds/indicators',
                icon: FileJsonIcon,
                subItems: [
                  {
                    title: 'UC025',
                    url: '/ocds/indicators/uc025',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'UC036',
                    url: '/ocds/indicators/uc036',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'UC040',
                    url: '/ocds/indicators/uc040',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'UC043',
                    url: '/ocds/indicators/uc043',
                    icon: FileJsonIcon,
                  },
                  {
                    title: 'UC053',
                    url: '/ocds/indicators/uc053',
                    icon: FileJsonIcon,
                  },
                ],
              },
            ],
          },
          // {
          //   title: 'Item Master',
          //   url: '/orders',
          //   icon: LucideMenu,
          //   subItems: [
          //     {
          //       title: 'Item Master',
          //       url: '/products/draft-item',
          //     },
          //     {
          //       title: 'Pending for Approval',
          //       url: '/products/pending-for-approval',
          //     },
          //     {
          //       title: 'Published',
          //       url: '/products/published',
          //     },
          //     {
          //       title: 'Inactive',
          //       url: '/products/inactive',
          //     },
          //   ],
          // },
          // {
          //   title: 'Consignor',
          //   url: '/consignor',
          //   icon: ShoppingBagIcon,
          // },
          // {
          //   title: 'Product Listings',
          //   url: '/orders',
          //   icon: LucideMenu,
          //   subItems: [
          //     {
          //       title: 'Item Master',
          //       url: '/products/draft-item',
          //     },
          //     {
          //       title: 'Pending for Approval',
          //       url: '/products/pending-for-approval',
          //     },
          //     {
          //       title: 'Published',
          //       url: '/products/published',
          //     },
          //     {
          //       title: 'Inactive',
          //       url: '/products/inactive',
          //     },
          //   ],
          // },
          // {
          //   title: 'Manage Categories',
          //   url: '/orders',
          //   icon: ShoppingCart,
          //   subItems: [
          //     {
          //       title: 'Item Master',
          //       url: '/products/draft-item',
          //     },
          //     {
          //       title: 'Pending for Approval',
          //       url: '/products/pending-for-approval',
          //     },
          //     {
          //       title: 'Published',
          //       url: '/products/published',
          //     },
          //     {
          //       title: 'Inactive',
          //       url: '/products/inactive',
          //     },
          //   ],
          // },
          // {
          //   title: 'Agency Orders',
          //   url: '/orders',
          //   icon: LucideMenu,
          //   subItems: [
          //     {
          //       title: 'Item Master',
          //       url: '/products/draft-item',
          //     },
          //     {
          //       title: 'Pending for Approval',
          //       url: '/products/pending-for-approval',
          //     },
          //     {
          //       title: 'Published',
          //       url: '/products/published',
          //     },
          //     {
          //       title: 'Inactive',
          //       url: '/products/inactive',
          //     },
          //   ],
          // },
          // {
          //   title: 'Payment List',
          //   url: '/payment-list',
          //   icon: IdCardIcon,
          // },
        ],
      },
    ],
  },
};