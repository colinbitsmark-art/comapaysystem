import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/common/StatCard";
import {
  useGetCurrenciesQuery,
  useGetCustomersQuery,
  useGetOrdersQuery,
  useGetUsersQuery,
} from "../services/api";
import { OrderStatus } from "../types";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: currencies = [] } = useGetCurrenciesQuery();
  const { data: customers = [] } = useGetCustomersQuery();
  const { data: users = [] } = useGetUsersQuery();
  const { data: ordersData } = useGetOrdersQuery({ limit: 10000 });
  const orders = ordersData?.orders ?? [];
  const totalOrders = ordersData?.total ?? 0;

  const stats = useMemo(() => {
    const ordersArray = Array.isArray(orders) ? orders : [];

    const saved = ordersArray.filter((o) => o.status === "saved").length;
    const completed = ordersArray.filter((o) => o.status === "completed").length;
    const cancelled = ordersArray.filter((o) => o.status === "cancelled").length;

    return {
      currencies: currencies.length,
      customers: customers.length,
      users: users.length,
      orders: totalOrders,
      saved,
      completed,
      cancelled,
    };
  }, [orders, totalOrders, currencies.length, customers.length, users.length]);

  const handleTotalOrdersClick = () => {
    navigate("/orders");
  };

  const handlePendingOrdersClick = () => {
    navigate("/orders", {
      state: {
        initialFilters: {
          status: "saved" as OrderStatus,
        },
      },
    });
  };

  const handleCompletedOrdersClick = () => {
    navigate("/orders", {
      state: {
        initialFilters: {
          status: "completed" as OrderStatus,
        },
      },
    });
  };

  const handleCancelledOrdersClick = () => {
    navigate("/orders", {
      state: {
        initialFilters: {
          status: "cancelled" as OrderStatus,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("dashboard.totalOrders")}
          value={stats.orders}
          tone="amber"
          onClick={handleTotalOrdersClick}
        />
        <StatCard
          label={t("dashboard.pendingOrders")}
          value={stats.saved}
          tone="amber"
          onClick={handlePendingOrdersClick}
        />
        <StatCard
          label={t("dashboard.completedOrders")}
          value={stats.completed}
          tone="emerald"
          onClick={handleCompletedOrdersClick}
        />
        <StatCard
          label={t("dashboard.cancelledOrders")}
          value={stats.cancelled}
          tone="rose"
          onClick={handleCancelledOrdersClick}
        />
      </div>
    </div>
  );
}
