import { Home, HomeIcon, IdCardIcon, LucideIcon, LucideMenu, PieChartIcon, ShoppingBagIcon, ShoppingCart } from "lucide-react";

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
  navMain: {  admin: NavGroup[] }
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
            icon: HomeIcon,
          },
          {
            title: 'Bids and Awards Analytics',
            url: '/bids-and-awards-analytics',
            icon: ShoppingBagIcon,
          },
          {
            title: 'Government Agency Analytics',
            url: '/government-agency-analytics',
            icon: PieChartIcon,
          },
          {
            title: 'Observers Analytics',
            url: '/observers-analytics',
            icon: IdCardIcon,
          },
          {
            title: 'eMarketplace Analytics',
            url: '/emarketplace-analytics',
            icon: LucideMenu,
          },
          {
            title: 'Virtual Store Analytics',
            url: '/virtual-store-analytics',
            icon: ShoppingCart,
          },
          {
            title: 'Collusion Monitoring',
            url: '/collusion-monitoring',
            icon: LucideMenu,
          },
          {
            title: 'Beneficial Ownership',
            url: '/beneficial-ownership',
            icon: LucideMenu,
          },
          {
            title: 'Green Procurement',
            url: '/green-procurement',
            icon: LucideMenu,
          },
          {
            title: 'OCDS',
            // url: '/ocds',
            icon: LucideMenu,
            subItems: [
              {
                title: 'Red Flags',
                url: '/ocds/red-flags',
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