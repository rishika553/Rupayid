import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EligibilityService } from './eligibility.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('eligibility')
@Controller('eligibility')
@ApiBearerAuth()
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get('rules')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'List all eligibility rules' })
  async findAll() {
    return this.eligibilityService.findAll();
  }

  @Get('rules/:id')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'Get rule by ID' })
  async findOne(@Param('id') id: string) {
    return this.eligibilityService.findById(id);
  }

  @Post('rules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create eligibility rule' })
  async create(@Body() data: { name: string; key: string; ruleType: string; operator: string; value: unknown; description?: string }) {
    return this.eligibilityService.create(data);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate user eligibility' })
  async evaluate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { loanProductId?: string },
  ) {
    return this.eligibilityService.evaluate(user.id, data.loanProductId);
  }

  @Get('evaluations/my')
  @ApiOperation({ summary: 'Get my evaluation results' })
  async myEvaluations(@CurrentUser() user: CurrentUserPayload) {
    return this.eligibilityService.findEvaluations(user.id);
  }
}
