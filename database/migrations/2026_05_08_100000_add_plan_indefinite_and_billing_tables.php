<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'pro_subscription_indefinite')) {
                    $table->boolean('pro_subscription_indefinite')->default(false)->after('pro_last_payment_reference');
                }
                if (! Schema::hasColumn('users', 'pro_subscription_indefinite_started_at')) {
                    $table->timestamp('pro_subscription_indefinite_started_at')->nullable()->after('pro_subscription_indefinite');
                }
                if (! Schema::hasColumn('users', 'pro_subscription_indefinite_paused')) {
                    $table->boolean('pro_subscription_indefinite_paused')->default(false)->after('pro_subscription_indefinite_started_at');
                }
            });
        }

        if (! Schema::hasTable('plan_pro_payment_logs')) {
            Schema::create('plan_pro_payment_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('payment_method', 32);
                $table->decimal('gross_amount', 12, 2)->default(0);
                $table->string('currency', 3)->default('MXN');
                $table->decimal('processor_fee_estimate', 12, 2)->default(0);
                $table->decimal('net_after_fee_estimate', 12, 2)->default(0);
                $table->decimal('net_approx_usd', 12, 2)->default(0);
                $table->decimal('net_approx_mxn', 12, 2)->default(0);
                $table->string('payment_reference', 120)->nullable();
                $table->timestamps();

                $table->index(['created_at', 'payment_method']);
            });
        }

        if (! Schema::hasTable('plan_promotional_feedbacks')) {
            Schema::create('plan_promotional_feedbacks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->text('body');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('plan_revenue_monthly_snapshots')) {
            Schema::create('plan_revenue_monthly_snapshots', function (Blueprint $table) {
                $table->id();
                $table->unsignedSmallInteger('year');
                $table->unsignedTinyInteger('month');
                $table->json('payload');
                $table->timestamps();

                $table->unique(['year', 'month']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_revenue_monthly_snapshots');
        Schema::dropIfExists('plan_promotional_feedbacks');
        Schema::dropIfExists('plan_pro_payment_logs');

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                foreach (['pro_subscription_indefinite_paused', 'pro_subscription_indefinite_started_at', 'pro_subscription_indefinite'] as $col) {
                    if (Schema::hasColumn('users', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
