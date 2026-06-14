# 景区游船班次管理系统

基于 React 18 + TypeScript + Vite 开发的景区游船班次管理前端系统，支持调度员、游客、码头人员三类角色，实现游船班次、订单、登船核销等全流程管理。

## 功能特性

### 角色体系
- **调度员**：维护船只、检修记录、班次计划、停航处置、运营统计
- **游客**：班次查询、余票查看、在线购票、订单管理、改签退票
- **码头人员**：登船登记、登船记录、核销校验

### 核心功能
- 调度日历可视化
- 余票矩阵展示
- 船只管理与检修
- 班次排班与停航
- 订单管理与改签
- 候补转正机制
- 退款明细管理
- 船只检查记录
- 运营统计报表
- 二维码登船校验

## 技术栈

- **框架**：React 18 + TypeScript
- **构建**：Vite
- **样式**：Tailwind CSS
- **状态管理**：Zustand（带 persist 中间件，本地持久化）
- **图标**：Lucide React
- **容器化**：Docker + Nginx

## 业务规则

### 停航停售
- 大风/恶劣天气停航日不能售票
- 停航日不可新增班次
- 已取消班次标记为 `cancelled` 状态

### 检修船不可排班
- 维护中（`maintenance` 状态）的船只不能分配班次
- 排班时自动校验船只状态
- 检修期间班次自动取消并进入退款流程

### 已登船订单不可退票
- 订单状态为 `boarded`（已登船）时不允许退票
- 退票前校验订单状态
- 已退票订单不可重复操作

### 停航订单处理
- 停航后，已支付且待登船的订单自动进入退款队列
- 乘客可选择改签其他班次或全额退款
- 退款明细自动记录，支持扣费规则配置

## 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 容器化运行

#### 方式一：docker-compose 一键启动

```bash
# 构建并启动容器
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

启动后访问：http://localhost:8080

#### 方式二：单独使用 Docker

```bash
# 构建镜像
docker build -t scenic-boat-system .

# 运行容器
docker run -d -p 8080:80 --name scenic-boat scenic-boat-system

# 查看容器状态
docker ps -a | grep scenic-boat

# 查看日志
docker logs -f scenic-boat

# 停止并删除容器
docker stop scenic-boat && docker rm scenic-boat
```

### 演示场景

系统内置完整的演示数据，首次访问可体验以下场景：

1. **满员演示**：部分热门班次显示满员状态，不可购票
2. **停航演示**：存在停航日标记，当天班次自动取消
3. **检修演示**：部分船只处于维护状态，不可排班
4. **改签演示**：支持已支付订单改签到其他班次
5. **退票扣费演示**：根据退票时间规则计算退票手续费

### 角色入口

- 首页点击角色卡片进入对应页面
- 调度员：`/dispatcher`
- 游客：`/tourist`
- 码头人员：`/dock`

## 目录结构

```
src/
├── components/       # 公共组件
├── pages/           # 页面组件
│   ├── dispatcher/  # 调度员页面
│   ├── tourist/     # 游客页面
│   └── dock/        # 码头人员页面
├── store/           # Zustand 状态管理
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── App.tsx          # 应用入口
└── main.tsx         # 根入口
```

## 数据持久化

所有业务数据通过 Zustand persist 中间件存储在浏览器 localStorage 中，刷新页面数据不丢失。包括：

- 船只与检修记录
- 班次与船员排班
- 订单与乘客信息
- 候补与退款记录
- 码头/航线/船型等基础数据
