
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Filter, FileDown, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Customer, 
  Order, 
  OrderItem, 
  getCustomers, 
  getOrders, 
  useOrderService 
} from '@/services/order.service';
import { useInventoryService } from '@/services/inventory.service';

const Orders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isViewOrderDialogOpen, setIsViewOrderDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const orderService = useOrderService();
  const inventoryService = useInventoryService();
  
  // Estado para los datos
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<{ id: number, name: string, price: number, stock: number }[]>([]);
  
  // New order state
  const [newOrderItems, setNewOrderItems] = useState<OrderItem[]>([]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const loadCustomers = getCustomers();
    const loadOrders = getOrders();
    const loadProducts = inventoryService.getInventory().map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.mainWarehouse + p.warehouse1 + p.warehouse2 + p.warehouse3
    }));
    
    setCustomers(loadCustomers);
    setOrders(loadOrders);
    setProducts(loadProducts);
  }, []);
  
  const filteredOrders = orders.filter(order => 
    (searchQuery === '' || 
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'all' || order.status === statusFilter)
  );

  const addProductToOrder = (productId: number) => {
    const product = products.find(p => p.id === parseInt(productId.toString()));
    
    if (product) {
      setNewOrderItems([
        ...newOrderItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price
        }
      ]);
    }
  };

  const removeProductFromOrder = (index: number) => {
    const updatedItems = [...newOrderItems];
    updatedItems.splice(index, 1);
    setNewOrderItems(updatedItems);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updatedItems = [...newOrderItems];
    updatedItems[index].quantity = quantity;
    setNewOrderItems(updatedItems);
  };

  const calculateTotal = () => {
    return newOrderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCreateOrder = () => {
    if (!selectedCustomer || newOrderItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor seleccione un cliente y añada al menos un producto",
        variant: "destructive"
      });
      return;
    }

    try {
      // Crear el pedido
      const newOrder = orderService.createOrder({
        customerId: parseInt(selectedCustomer),
        items: newOrderItems
      });
      
      // Actualizar la lista de pedidos
      setOrders([newOrder, ...orders]);
      
      // Reset form
      setSelectedCustomer('');
      setNewOrderItems([]);
      setIsNewOrderDialogOpen(false);
    } catch (error: any) {
      console.error(error);
    }
  };

  const viewOrder = (order: Order) => {
    setCurrentOrder(order);
    setIsViewOrderDialogOpen(true);
  };

  const updateOrderStatus = (status: Order['status'], deliveryPersonId?: number, deliveryPersonName?: string) => {
    if (currentOrder) {
      try {
        // Actualizar el estado del pedido
        const updatedOrder = orderService.updateOrderStatus(
          currentOrder.id, 
          status,
          deliveryPersonId,
          deliveryPersonName
        );
        
        // Actualizar la lista de pedidos
        setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setIsViewOrderDialogOpen(false);
      } catch (error: any) {
        console.error(error);
      }
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Pendiente</Badge>;
      case 'preparacion':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">En Preparación</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Enviado</Badge>;
      case 'entregado':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Entregado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pedidos</h1>
        <p className="text-muted-foreground">
          Gestión de pedidos de clientes y seguimiento de estado.
        </p>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <Card className="md:w-1/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pedidos Recientes</CardTitle>
            <CardDescription>Última actualización: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Pendientes</span>
                <span className="font-medium">{orders.filter(o => o.status === 'pendiente').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">En preparación</span>
                <span className="font-medium">{orders.filter(o => o.status === 'preparacion').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Enviados</span>
                <span className="font-medium">{orders.filter(o => o.status === 'enviado').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Entregados</span>
                <span className="font-medium">{orders.filter(o => o.status === 'entregado').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:w-2/3 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Resumen de Ventas</CardTitle>
              <Button variant="outline" size="sm" className="h-8">
                <FileDown className="h-4 w-4 mr-1" /> Exportar
              </Button>
            </div>
            <CardDescription>Periodo: Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold">
                  ${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-card rounded-lg p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <div className="bg-card rounded-lg p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-2xl font-bold">
                  ${orders.length > 0 ? (orders.reduce((sum, order) => sum + order.total, 0) / orders.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Pedidos</CardTitle>
              <CardDescription>
                Administra y da seguimiento a los pedidos de tus clientes
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Pedido
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Pedido</DialogTitle>
                    <DialogDescription>
                      Complete los detalles para crear un nuevo pedido
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Cliente</Label>
                      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCustomer && (
                        <p className="text-sm text-muted-foreground">
                          {customers.find(c => c.id === parseInt(selectedCustomer))?.address}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <Label>Productos</Label>
                        <Select onValueChange={(value) => addProductToOrder(parseInt(value))}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Añadir Producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - ${product.price.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {newOrderItems.length > 0 ? (
                        <div className="border rounded-md mt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Subtotal</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {newOrderItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell>${item.price.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => updateQuantity(index, parseInt(e.target.value))}
                                      className="w-20"
                                    />
                                  </TableCell>
                                  <TableCell>${(item.price * item.quantity).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeProductFromOrder(index)}
                                    >
                                      Eliminar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                                <TableCell className="font-medium">${calculateTotal().toFixed(2)}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="border rounded-md p-6 text-center text-muted-foreground">
                          No hay productos en el pedido. Añada productos usando el selector.
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewOrderDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateOrder}>Crear Pedido</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar pedido..."
                  className="pl-8 md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-[180px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Estado" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="preparacion">En Preparación</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
            
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nº Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                      <TableCell>{order.items?.length || 0} productos</TableCell>
                      <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => viewOrder(order)}
                          >
                            Ver Detalles
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No se encontraron pedidos que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewOrderDialogOpen} onOpenChange={setIsViewOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          {currentOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Detalles del Pedido #{currentOrder.orderNumber}
                </DialogTitle>
                <DialogDescription>
                  Fecha: {new Date(currentOrder.date).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Cliente</h3>
                    <p className="text-sm">{currentOrder.customer}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Estado</h3>
                    <div>{getStatusBadge(currentOrder.status)}</div>
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium mb-1">Dirección de Entrega</h3>
                    <p className="text-sm">{currentOrder.address}</p>
                  </div>
                  {currentOrder.deliveryPersonName && (
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium mb-1">Repartidor</h3>
                      <p className="text-sm">{currentOrder.deliveryPersonName}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Productos</h3>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentOrder.items?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                          <TableCell className="text-right font-medium">${currentOrder.total.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                {currentOrder.status === 'pendiente' && (
                  <Button 
                    variant="outline"
                    className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
                    onClick={() => updateOrderStatus('preparacion')}
                  >
                    Pasar a Preparación
                  </Button>
                )}
                {currentOrder.status === 'preparacion' && (
                  <Button 
                    variant="outline" 
                    className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"
                    onClick={() => updateOrderStatus('enviado', 1, 'Luis Torres')}
                  >
                    Marcar como Enviado
                  </Button>
                )}
                {currentOrder.status === 'enviado' && (
                  <Button 
                    variant="outline" 
                    className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                    onClick={() => updateOrderStatus('entregado')}
                  >
                    Marcar como Entregado
                  </Button>
                )}
                {currentOrder.status !== 'entregado' && currentOrder.status !== 'cancelado' && (
                  <Button 
                    variant="outline" 
                    className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                    onClick={() => updateOrderStatus('cancelado')}
                  >
                    Cancelar Pedido
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setIsViewOrderDialogOpen(false)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
